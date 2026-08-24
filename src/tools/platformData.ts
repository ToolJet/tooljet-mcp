import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const record = z.record(z.string(), z.any());
const nonEmpty = z.string().min(1);

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} is required for this action.`);
  return encodeURIComponent(value);
}

function requireConfirm(confirm: boolean | undefined, action: string): void {
  if (confirm !== true) throw new Error(`${action} requires confirm:true after exact-target user approval.`);
}

function actionTool(
  client: ToolJetClient,
  name: string,
  description: string,
  inputSchema: z.ZodRawShape,
  run: (args: any) => Promise<unknown>
): ToolDef {
  return {
    name,
    description,
    inputSchema,
    async handler(args: any) {
      try {
        return ok(await run(args));
      } catch (error) {
        return fail(error);
      }
    },
  };
}

function redactSecretValues(value: unknown, inheritedSecret = false): unknown {
  if (Array.isArray(value)) return value.map((child) => redactSecretValues(child, inheritedSecret));
  if (!value || typeof value !== 'object') return value;
  const input = value as Record<string, unknown>;
  const secret = inheritedSecret || String(input.type ?? input.constant_type ?? '').toLowerCase() === 'secret';
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(input)) {
    output[key] = secret && ['value', 'decrypted_value', 'default_value'].includes(key.toLowerCase())
      ? '[REDACTED]'
      : redactSecretValues(child, secret);
  }
  return output;
}

function containsResourceId(value: unknown, id: string): boolean {
  if (Array.isArray(value)) return value.some((child) => containsResourceId(child, id));
  if (!value || typeof value !== 'object') return false;
  const input = value as Record<string, unknown>;
  if (String(input.id ?? input.constant_id ?? '') === id) return true;
  return Object.values(input).some((child) => containsResourceId(child, id));
}

function isSecretConstantPayload(payload: Record<string, unknown> | undefined): boolean {
  if (!payload) return false;
  return String(payload.type ?? payload.constant_type ?? '').toLowerCase() === 'secret';
}

export function platformDataTools(client: ToolJetClient): ToolDef[] {
  const datasource = actionTool(
    client,
    'manage_datasource_connection',
    'Manage ToolJet datasource connections. Actions: list_global, list_for_app, create, update, delete, change_scope, ' +
      'get_environment, validate_options, test, test_sample, oauth_url, authorize_oauth, dependencies, plugin_dependencies, invoke. ' +
      'Delete, connection tests, OAuth authorization, and invoke require confirm:true. Never supply credentials unless the user explicitly provided them for this action.',
    {
      action: z.enum(['list_global', 'list_for_app', 'create', 'update', 'delete', 'change_scope', 'get_environment', 'validate_options', 'test', 'test_sample', 'oauth_url', 'authorize_oauth', 'dependencies', 'plugin_dependencies', 'invoke']),
      datasource_id: nonEmpty.optional(),
      plugin_id: nonEmpty.optional(),
      version_id: nonEmpty.optional(),
      environment_id: nonEmpty.optional(),
      payload: record.optional(),
      query: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const organizationId = encodeURIComponent(await client.getActiveWorkspaceId());
      if (args.action === 'list_global') return client.apiRequest({ operation: 'listGlobalDatasources', path: `/api/data-sources/${organizationId}` });
      if (args.action === 'list_for_app') {
        const env = required(args.environment_id, 'environment_id');
        const version = required(args.version_id, 'version_id');
        return client.apiRequest({ operation: 'listAppDatasources', path: `/api/data-sources/${organizationId}/environments/${env}/versions/${version}` });
      }
      if (args.action === 'create') return client.apiRequest({ operation: 'createDatasource', path: '/api/data-sources', method: 'POST', body: args.payload ?? {} });
      if (args.action === 'test_sample') {
        requireConfirm(args.confirm, 'test sample datasource connection');
        return client.apiRequest({ operation: 'testSampleDatasource', path: '/api/data-sources/sample-db/test-connection', method: 'POST', body: args.payload ?? {} });
      }
      if (args.action === 'oauth_url') return client.apiRequest({ operation: 'getDatasourceOauthUrl', path: '/api/data-sources/fetch-oauth2-base-url', method: 'POST', body: args.payload ?? {} });
      if (args.action === 'plugin_dependencies') {
        const plugin = required(args.plugin_id, 'plugin_id');
        return client.apiRequest({ operation: 'getPluginDatasourceDependencies', path: `/api/data-sources/dependent-queries/marketplace-plugin/${plugin}` });
      }
      const id = required(args.datasource_id, 'datasource_id');
      if (args.action === 'update') return client.apiRequest({ operation: 'updateDatasource', path: `/api/data-sources/${id}`, method: 'PUT', query: { environment_id: args.environment_id }, body: args.payload ?? {} });
      if (args.action === 'delete') {
        requireConfirm(args.confirm, `delete datasource ${args.datasource_id}`);
        return client.apiRequest({ operation: 'deleteDatasource', path: `/api/data-sources/${id}`, method: 'DELETE' });
      }
      if (args.action === 'change_scope') {
        requireConfirm(args.confirm, `change datasource scope ${args.datasource_id}`);
        return client.apiRequest({ operation: 'changeDatasourceScope', path: `/api/data-sources/${id}/scope`, method: 'POST' });
      }
      if (args.action === 'get_environment') {
        const env = required(args.environment_id, 'environment_id');
        return client.apiRequest({ operation: 'getDatasourceEnvironment', path: `/api/data-sources/${id}/environment/${env}` });
      }
      if (args.action === 'validate_options') return client.apiRequest({ operation: 'validateDatasourceOptions', path: `/api/data-sources/${id}/validate-options`, method: 'POST', query: { environment_id: args.environment_id }, body: args.payload ?? {} });
      if (args.action === 'dependencies') return client.apiRequest({ operation: 'getDatasourceDependencies', path: `/api/data-sources/dependent-queries/${id}` });
      if (['test', 'authorize_oauth', 'invoke'].includes(args.action)) requireConfirm(args.confirm, `${args.action} datasource ${args.datasource_id}`);
      const suffix = args.action === 'test' ? 'test-connection' : args.action === 'authorize_oauth' ? 'authorize_oauth2' : 'invoke';
      return client.apiRequest({ operation: `${args.action}Datasource`, path: `/api/data-sources/${id}/${suffix}`, method: 'POST', query: args.action === 'authorize_oauth' ? { environment_id: args.environment_id } : undefined, body: args.payload ?? {} });
    }
  );

  const queryFolder = actionTool(
    client,
    'manage_query_folder',
    'Manage query folders. Actions: list, create, rename, reorder, batch_reorder, delete. Delete requires confirm:true.',
    {
      action: z.enum(['list', 'create', 'rename', 'reorder', 'batch_reorder', 'delete']),
      version_id: nonEmpty.optional(),
      folder_id: nonEmpty.optional(),
      name: z.string().optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') return client.apiRequest({ operation: 'listQueryFolders', path: '/api/data-query-folders', query: { appVersionId: args.version_id } });
      if (args.action === 'create') return client.apiRequest({ operation: 'createQueryFolder', path: '/api/data-query-folders', method: 'POST', body: { name: args.name, appVersionId: args.version_id, ...(args.payload ?? {}) } });
      if (args.action === 'reorder' || args.action === 'batch_reorder') return client.apiRequest({ operation: `${args.action}QueryFolders`, path: `/api/data-query-folders/${args.action === 'batch_reorder' ? 'batch-reorder' : 'reorder'}`, method: 'PATCH', body: args.payload ?? {} });
      const id = required(args.folder_id, 'folder_id');
      if (args.action === 'delete') requireConfirm(args.confirm, `delete query folder ${args.folder_id}`);
      return client.apiRequest({ operation: `${args.action}QueryFolder`, path: `/api/data-query-folders/${id}`, method: args.action === 'rename' ? 'PATCH' : 'DELETE', body: args.action === 'rename' ? { name: args.name, ...(args.payload ?? {}) } : undefined });
    }
  );

  const advancedQuery = actionTool(
    client,
    'manage_query_advanced',
    'Advanced query operations not covered by add/update/run_query. Actions: list, preview, bulk_update, ' +
      'create_workflow_node, list_datasource_tables, repoint. Preview requires confirm:true because it executes the query.',
    {
      action: z.enum(['list', 'preview', 'bulk_update', 'create_workflow_node', 'list_datasource_tables', 'repoint']),
      query_id: nonEmpty.optional(),
      version_id: nonEmpty.optional(),
      datasource_id: nonEmpty.optional(),
      environment_id: nonEmpty.optional(),
      mode: z.string().optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') {
        const version = required(args.version_id, 'version_id');
        return client.apiRequest({ operation: 'listDataQueries', path: `/api/data-queries/${version}`, query: { mode: args.mode } });
      }
      if (args.action === 'create_workflow_node') return client.apiRequest({ operation: 'createWorkflowQueryNode', path: '/api/data-queries/workflow-node', method: 'POST', body: args.payload ?? {} });
      if (args.action === 'list_datasource_tables') {
        const ds = required(args.datasource_id, 'datasource_id');
        const env = required(args.environment_id, 'environment_id');
        return client.apiRequest({ operation: 'listDatasourceTables', path: `/api/data-queries/${ds}/list-tables/${env}` });
      }
      if (args.action === 'bulk_update') {
        const version = required(args.version_id, 'version_id');
        return client.apiRequest({ operation: 'bulkUpdateQueries', path: `/api/data-queries/versions/${version}`, method: 'PATCH', body: args.payload ?? {} });
      }
      const queryId = required(args.query_id, 'query_id');
      const versionId = required(args.version_id, 'version_id');
      if (args.action === 'preview') {
        requireConfirm(args.confirm, `preview query ${args.query_id}`);
        const env = required(args.environment_id, 'environment_id');
        return client.apiRequest({ operation: 'previewQuery', path: `/api/data-queries/${queryId}/versions/${versionId}/preview/${env}`, method: 'POST', body: args.payload ?? {} });
      }
      return client.apiRequest({ operation: 'repointQuery', path: `/api/data-queries/${queryId}/versions/${versionId}/data-source`, method: 'PUT', body: { data_source_id: args.datasource_id, ...(args.payload ?? {}) } });
    }
  );

  const tooljetDb = actionTool(
    client,
    'manage_tooljet_database',
    'Full ToolJet Database management. Actions: list_tables, view_table, create_table, rename_table, delete_table, ' +
      'add_column, edit_column, delete_column, bulk_upload, create_foreign_key, update_foreign_key, delete_foreign_key, ' +
      'read_rows, insert_rows, update_rows, delete_rows. Reads require a limit <=1000. All deletes and row updates require confirm:true.',
    {
      action: z.enum(['list_tables', 'view_table', 'create_table', 'rename_table', 'delete_table', 'add_column', 'edit_column', 'delete_column', 'bulk_upload', 'create_foreign_key', 'update_foreign_key', 'delete_foreign_key', 'read_rows', 'insert_rows', 'update_rows', 'delete_rows']),
      table_name: nonEmpty.optional(),
      table_id: nonEmpty.optional(),
      column_name: nonEmpty.optional(),
      foreign_key_id: nonEmpty.optional(),
      payload: z.any().optional(),
      query: record.optional(),
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      csv_base64: z.string().optional(),
      filename: z.string().optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const organizationId = encodeURIComponent(await client.getActiveWorkspaceId());
      const orgBase = `/api/tooljet-db/organizations/${organizationId}`;
      if (args.action === 'list_tables') return client.apiRequest({ operation: 'listTooljetDbTables', path: `${orgBase}/tables` });
      if (args.action === 'create_table') return client.apiRequest({ operation: 'createTooljetDbTable', path: `${orgBase}/table`, method: 'POST', body: args.payload ?? {} });
      if (['read_rows', 'insert_rows', 'update_rows', 'delete_rows'].includes(args.action)) {
        const tableId = required(args.table_id, 'table_id');
        const path = `/api/tooljet-db/proxy/${tableId}`;
        if (args.action === 'read_rows') return client.apiRequest({ operation: 'readTooljetDbRows', path, query: { ...args.query, limit: args.limit ?? 100, offset: args.offset ?? 0 } });
        if (args.action === 'insert_rows') return client.apiRequest({ operation: 'insertTooljetDbRows', path, method: 'POST', body: args.payload ?? {} });
        requireConfirm(args.confirm, `${args.action} in table ${args.table_id}`);
        const filterKeys = Object.keys(args.query ?? {}).filter(
          (key) => !['select', 'order', 'limit', 'offset'].includes(key)
        );
        if (filterKeys.length === 0) {
          throw new Error(`${args.action} requires an explicit PostgREST filter in query; unbounded row mutations are refused.`);
        }
        return client.apiRequest({ operation: `${args.action}TooljetDb`, path, method: args.action === 'update_rows' ? 'PATCH' : 'DELETE', query: args.query, body: args.action === 'update_rows' ? args.payload ?? {} : undefined });
      }
      const tableName = required(args.table_name, 'table_name');
      const tableBase = `${orgBase}/table/${tableName}`;
      if (args.action === 'view_table') return client.apiRequest({ operation: 'viewTooljetDbTable', path: tableBase });
      if (args.action === 'rename_table') return client.apiRequest({ operation: 'renameTooljetDbTable', path: tableBase, method: 'PATCH', body: args.payload ?? {} });
      if (args.action === 'delete_table') {
        requireConfirm(args.confirm, `delete table ${args.table_name}`);
        return client.apiRequest({ operation: 'deleteTooljetDbTable', path: tableBase, method: 'DELETE' });
      }
      if (args.action === 'bulk_upload') {
        if (!args.csv_base64) throw new Error('csv_base64 is required for bulk_upload.');
        return client.apiRequest({ operation: 'bulkUploadTooljetDb', path: `${tableBase}/bulk-upload`, method: 'POST', multipart: { fieldName: 'file', filename: args.filename ?? `${args.table_name}.csv`, contentBase64: args.csv_base64, contentType: 'text/csv' } });
      }
      if (args.action === 'add_column') return client.apiRequest({ operation: 'addTooljetDbColumn', path: `${tableBase}/column`, method: 'POST', body: args.payload ?? {} });
      if (args.action === 'edit_column') return client.apiRequest({ operation: 'editTooljetDbColumn', path: `${tableBase}/column`, method: 'PATCH', body: args.payload ?? {} });
      if (args.action === 'delete_column') {
        requireConfirm(args.confirm, `delete column ${args.column_name} from ${args.table_name}`);
        const column = required(args.column_name, 'column_name');
        return client.apiRequest({ operation: 'deleteTooljetDbColumn', path: `${tableBase}/column/${column}`, method: 'DELETE' });
      }
      if (args.action === 'create_foreign_key') return client.apiRequest({ operation: 'createTooljetDbForeignKey', path: `${tableBase}/foreignkey`, method: 'POST', body: args.payload ?? {} });
      if (args.action === 'update_foreign_key') return client.apiRequest({ operation: 'updateTooljetDbForeignKey', path: `${tableBase}/foreignkey`, method: 'PUT', body: args.payload ?? {} });
      requireConfirm(args.confirm, `delete foreign key ${args.foreign_key_id}`);
      const fk = required(args.foreign_key_id, 'foreign_key_id');
      return client.apiRequest({ operation: 'deleteTooljetDbForeignKey', path: `${tableBase}/foreignkey/${fk}`, method: 'DELETE' });
    }
  );

  const constant = actionTool(
    client,
    'manage_workspace_constant',
    'Manage public workspace constants and inspect secret metadata. Actions: list, list_secrets, create, update, ' +
      'delete, get_environment, get_app, get_public_app. Secret values and secret writes are never exposed through ' +
      'MCP; use ToolJet settings for secret creation or rotation. Delete requires confirm:true.',
    {
      action: z.enum(['list', 'list_secrets', 'create', 'update', 'delete', 'get_environment', 'get_app', 'get_public_app']),
      constant_id: nonEmpty.optional(),
      environment_id: nonEmpty.optional(),
      app_id: nonEmpty.optional(),
      app_slug: nonEmpty.optional(),
      payload: record.optional(),
      query: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      let result: unknown;
      if (args.action === 'list') result = await client.apiRequest({ operation: 'listWorkspaceConstants', path: '/api/organization-constants/decrypted', query: { type: 'Global' } });
      else if (args.action === 'list_secrets') result = await client.apiRequest({ operation: 'listWorkspaceSecrets', path: '/api/organization-constants/secrets' });
      else if (args.action === 'create') {
        if (isSecretConstantPayload(args.payload)) throw new Error('Secret creation is not exposed through MCP; use ToolJet workspace settings.');
        result = await client.apiRequest({ operation: 'createWorkspaceConstant', path: '/api/organization-constants', method: 'POST', body: args.payload ?? {} });
      }
      else if (args.action === 'get_environment') result = await client.apiRequest({ operation: 'getEnvironmentConstants', path: `/api/organization-constants/environment/${required(args.environment_id, 'environment_id')}`, query: { ...args.query, type: 'Global' } });
      else if (args.action === 'get_app') result = await client.apiRequest({ operation: 'getAppConstants', path: `/api/organization-constants/${required(args.app_id, 'app_id')}`, query: args.query });
      else if (args.action === 'get_public_app') result = await client.apiRequest({ operation: 'getPublicAppConstants', path: `/api/organization-constants/public/${required(args.app_slug, 'app_slug')}`, query: args.query });
      else {
        const id = required(args.constant_id, 'constant_id');
        const secretMetadata = await client.apiRequest({ operation: 'checkWorkspaceSecretMetadata', path: '/api/organization-constants/secrets' });
        if (containsResourceId(secretMetadata, args.constant_id)) {
          throw new Error('Secret updates and deletion are not exposed through MCP; use ToolJet workspace settings.');
        }
        if (args.action === 'delete') requireConfirm(args.confirm, `delete workspace constant ${args.constant_id}`);
        result = await client.apiRequest({ operation: `${args.action}WorkspaceConstant`, path: `/api/organization-constants/${id}`, method: args.action === 'update' ? 'PATCH' : 'DELETE', body: args.action === 'update' ? args.payload ?? {} : undefined });
      }
      return redactSecretValues(result, args.action === 'list_secrets');
    }
  );

  return [datasource, queryFolder, advancedQuery, tooljetDb, constant];
}
