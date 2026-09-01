import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { ok, fail, type ToolDef } from './types.js';
import { getDatasourceQuerySchema } from '../datasourceCatalog.js';

/**
 * Four outcomes hide behind ToolJet's two-field verdict, and conflating them produces confident
 * wrong advice. `testConnection` is optional on a plugin: 25 of 92 packages — every HTTP-passthrough
 * and OAuth kind (restapi, graphql, stripe, hubspot, gmail, salesforce, …) — do not implement it,
 * and ToolJet's util.service catches the resulting NotImplementedException and flattens it into a
 * normal `{status:'failed'}`. Reported as-is, that reads as "your working Stripe source is down".
 */
const NOT_IMPLEMENTED = /testconnection method not implemented/i;

/** ToolJet plugins flatten every negative test result into status:'failed', including validation
 *  errors and probes that require a table/resource. Only messages that explicitly prove the stored
 *  connection cannot reach or authenticate to the service may mark a datasource unhealthy. Unknown
 *  failures stay inconclusive and are verified through a separately approved bounded read. */
const EXPLICIT_CONNECTIVITY_FAILURE = new RegExp([
  'connection (?:was )?refused', 'econnrefused',
  '(?:could not|cannot|unable to|failed to) connect',
  'connection (?:timed out|timeout|terminated|closed)', 'etimedout',
  'network (?:is )?unreachable', 'enetunreach', 'ehostunreach',
  'getaddrinfo', 'enotfound', 'dns (?:lookup )?failed', 'host(?:name)? (?:was )?not found',
  'authentication (?:failed|error)', 'authorization (?:failed|error)',
  'invalid (?:credentials|password|api[ -]?key|access token|refresh token)',
  'login failed', 'unauthorized', 'access denied',
  '(?:credentials|password|api[ -]?key|access token|refresh token|certificate) (?:has |have )?expired',
  'ssl (?:error|failure)', 'tls (?:error|failure)', 'certificate (?:error|invalid|untrusted)',
  'free trial (?:has )?ended', 'warehouse(?:s)? (?:has |have )?been suspended',
  'account (?:is |has been )?suspended', 'billing (?:is )?disabled',
].join('|'), 'i');

function isExplicitConnectivityFailure(message: string | undefined): boolean {
  return !!message && EXPLICIT_CONNECTIVITY_FAILURE.test(message);
}

function inconclusiveResult(
  header: Record<string, unknown>,
  message: string | undefined
): ReturnType<typeof ok> {
  const detail = message?.trim();
  return ok({
    ...header,
    supported: true,
    status: 'inconclusive',
    message:
      'The datasource connection test did not prove that the connection is broken' +
      (detail ? ` (${detail})` : '') +
      '. Do not replace the requested datasource. Ask the user for permission, then verify it with a small, ' +
      'bounded read against the actual table or resource.',
    verification: {
      action: 'ask_then_run_bounded_read',
      requires_user_approval: true,
      instruction:
        'Name the saved query and target table/resource when asking. Permission to verify does not grant ' +
        'permission to substitute another datasource.',
    },
  });
}

function failedResult(header: Record<string, unknown>, message: string): ReturnType<typeof ok> {
  const settingsUrl = typeof header.settings_url === 'string' ? header.settings_url : undefined;
  return ok({
    ...header,
    supported: true,
    status: 'failed',
    message: message.trim(),
    recovery: {
      action: 'open_datasource_settings',
      ...(settingsUrl ? { url: settingsUrl } : {}),
      instruction:
        'Ask the user to repair this connection in ToolJet. Never enter credentials, authorize ' +
        'OAuth, or save settings on their behalf.',
    },
  });
}

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
function isForbidden(message: string): boolean {
  return /\(403\)/.test(message) || /forbidden/i.test(message);
}

function isNotFound(message: string): boolean {
  return /\(404\)/.test(message);
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
      'or to confirm a source before building on it. The result is tri-state: ok, failed only for an explicit ' +
      'connectivity/authentication failure, or inconclusive for plugin validation, missing-resource, and ' +
      'ambiguous failures. Inconclusive never means broken and must be verified with a separately approved ' +
      'bounded read. Returns supported:false when the plugin has no connection test at all. On a real failure, hand the returned ' +
      'settings_url to the user for repair; never enter credentials or save settings for them.',
    inputSchema: {
      version_id: z.string().min(1),
      datasource_id: z.string().min(1),
    },
    async handler(args: { version_id: string; datasource_id: string }) {
      let datasourceResolved = false;
      let header: Record<string, unknown> = { datasource: { id: args.datasource_id } };
      try {
        const datasource = (await client.listDatasources(args.version_id)).find(
          (candidate) => candidate.id === args.datasource_id
        );
        if (!datasource) {
          return fail(
            new Error(`Datasource "${args.datasource_id}" is not available on version "${args.version_id}".`)
          );
        }
        datasourceResolved = true;
        header = {
          datasource: { id: datasource.id, name: datasource.name, kind: datasource.kind },
          settings_url: datasource.settings_url,
        };

        // The catalog knows which plugins implement testConnection, so an unsupported kind costs no
        // HTTP calls. Only an explicit false short-circuits: an undefined flag means a stale or
        // partial catalog, which must degrade to asking ToolJet rather than to a wrong answer.
        if (getDatasourceQuerySchema(datasource.kind)?.supportsTestConnection === false) {
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
        if (message && NOT_IMPLEMENTED.test(message)) {
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
        if (!isExplicitConnectivityFailure(message)) {
          return inconclusiveResult(header, message);
        }
        return failedResult(header, message!);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // A permission denial is about the caller, not the datasource. Returned as a normal result
        // so the model reports it accurately instead of announcing a broken source.
        if (isForbidden(message)) {
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
        // Failure before listDatasources positively resolved the target is an MCP/ToolJet discovery
        // error, not a plugin verdict. Keep it as a tool error so infrastructure failures are visible.
        if (!datasourceResolved) return fail(err);
        if (isNotFound(message)) {
          return ok({
            ...header,
            supported: false,
            status: 'unsupported',
            message:
              `ToolJet has no datasource-level test endpoint for this connected source (${message}). ` +
              'This says nothing about its health; verify it with a separately approved bounded read.',
          });
        }
        return isExplicitConnectivityFailure(message)
          ? failedResult(header, message)
          : inconclusiveResult(header, message);
      }
    },
  };
}
