import { z } from 'zod';
import { ToolJetHttpError, type ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';
import { getDatasourceQuerySchema } from '../datasourceCatalog.js';

/**
 * Four outcomes hide behind ToolJet's two-field verdict, and conflating them produces confident
 * wrong advice. `testConnection` is optional on a plugin: 25 of 92 packages — every HTTP-passthrough
 * and OAuth kind (restapi, graphql, stripe, hubspot, gmail, salesforce, …) — do not implement it,
 * and ToolJet's util.service catches the resulting NotImplementedException and flattens it into a
 * normal `{status:'failed'}`. Reported as-is, that reads as "your working Stripe source is down".
 */
/** Identical whether the catalog pre-empted the call or ToolJet answered it, so the model cannot
 *  tell the two paths apart and cannot come to depend on the difference. */
function unsupportedMessage(kind: string): string {
  return (
    `Datasource kind "${kind}" does not implement a connection test. This is not a ` +
    'failure and carries no information about the connection: verify it with a bounded read instead.'
  );
}

/** Permission, not health: TEST_CONNECTION is granted to admins, datasource create/delete holders,
 *  all-editable/all-viewable, and per-datasource configurable grants — but NOT to a bare builder. */
function inconclusive(header: Record<string, unknown>, detail?: string) {
  return ok({
    ...header,
    supported: true,
    status: 'inconclusive',
    message: `The connection test did not prove this datasource is broken${detail ? ` (${detail.trim()})` : ''}.`,
    verification: { action: 'ask_then_run_bounded_read', requires_user_approval: true },
  });
}

export function testDatasourceConnectionTool(client: ToolJetClient): ToolDef {
  return {
    name: 'test_datasource_connection',
    title: 'Test Datasource Connection',
    // Probes reachability; changes nothing on either side.
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
    description:
      "Run ToolJet's own connection test for one ALREADY-CONNECTED datasource — the same check the " +
      'datasource settings page performs. Uses the datasource\'s stored credentials; you never supply, ' +
      'see, or need them. Use it to distinguish a broken connection from a wrong query when a run fails, ' +
      'or to confirm a source before building on it. Returns supported:false for datasource kinds whose ' +
      'plugin does not implement a connection test (REST API, GraphQL, and most OAuth/HTTP integrations) — ' +
      'that is not a fault and says nothing about the connection. On a real failure, hand the returned ' +
      'settings_url to the user for repair; never enter credentials or save settings for them.',
    inputSchema: {
      version_id: z.string().min(1),
      datasource_id: z.string().min(1),
    },
    async handler(args: { version_id: string; datasource_id: string }) {
      let header: Record<string, unknown> | undefined;
      try {
        const datasource = (await client.listDatasources(args.version_id)).find(
          (candidate) => candidate.id === args.datasource_id
        );
        if (!datasource) {
          return fail(
            new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`)
          );
        }
        header = {
          datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind },
          settings_url: datasource.settings_url,
        };

        // The catalog knows which plugins implement testConnection, so an unsupported kind costs no
        // HTTP calls. Only an explicit false short-circuits: an undefined flag means a stale or
        // partial catalog, which must degrade to asking ToolJet rather than to a wrong answer.
        const supportsTestConnection = getDatasourceQuerySchema(datasource.kind)?.supportsTestConnection;
        if (supportsTestConnection === false) {
          return ok({
            ...header,
            supported: false,
            status: 'unsupported',
            message: unsupportedMessage(datasource.kind),
          });
        }

        const details = await client.getDatasourceConnectionDetails(args.datasource_id);
        const result = await client.testDatasourceConnection({
          dataSourceId: datasource.id,
          kind: details.kind || datasource.kind,
          ...(details.pluginId ? { pluginId: details.pluginId } : {}),
          options: details.options,
        });

        const message = typeof result.message === 'string' ? result.message : undefined;
        if (result.category === 'unsupported') {
          return ok({
            ...header,
            supported: false,
            status: 'unsupported',
            message: unsupportedMessage(datasource.kind),
          });
        }
        if (result.status === 'ok') {
          return ok({ ...header, supported: true, status: 'ok' });
        }
        // ToolJet's endpoint contract is {status,message}; it does not return an error category.
        // A failed verdict is authoritative only when the catalog says this plugin implements the test.
        if (supportsTestConnection !== true) return inconclusive(header, message);
        return ok({
          ...header,
          supported: true,
          status: 'failed',
          ...(message ? { message: message.trim() } : {}),
          recovery: {
            action: 'open_datasource_settings',
            url: datasource.settings_url,
            instruction:
              'Ask the user to repair this connection in ToolJet. Never enter credentials, authorize ' +
              'OAuth, or save settings on their behalf.',
          },
        });
      } catch (err) {
        if (!header) return fail(err);
        // A permission denial is about the caller, not the datasource. Returned as a normal result
        // so the model reports it accurately instead of announcing a broken source.
        if (err instanceof ToolJetHttpError && err.method === 'testDatasourceConnection' && err.status === 403) {
          return ok({
            ...header,
            supported: true,
            status: 'not_permitted',
            message:
              'This ToolJet user is not permitted to test datasource connections (the ability is granted to ' +
              'admins, datasource create/delete holders, and users with editable/viewable datasource access). ' +
              'The connection itself was not tested.',
          });
        }
        if (err instanceof ToolJetHttpError && err.method === 'testDatasourceConnection' && err.status === 404) {
          return ok({
            ...header,
            supported: false,
            status: 'unsupported',
            message: 'ToolJet has no datasource-level test endpoint. This says nothing about connection health.',
          });
        }
        if (err instanceof ToolJetHttpError && err.method === 'testDatasourceConnection' && err.status === 501) {
          return ok({
            ...header,
            supported: false,
            status: 'unsupported',
            message: 'This ToolJet datasource plugin does not implement a connection test.',
          });
        }
        return fail(err);
      }
    },
  };
}
