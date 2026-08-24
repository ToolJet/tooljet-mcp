import { z } from 'zod';
import type { ToolJetClient } from '../tooljetClient.js';
import { fail, ok, type ToolDef } from './types.js';

const record = z.record(z.string(), z.any());
const nonEmpty = z.string().min(1);
const resourceType = z.enum(['page', 'query', 'component']);
const granularType = z.enum(['app', 'data_source']);
const themeColor = z.object({
  light: z.string().min(1).max(100),
  dark: z.string().min(1).max(100),
});
const themeDefinition = z.object({
  brand: z.object({
    colors: z.object({
      primary: themeColor,
      secondary: themeColor,
      tertiary: themeColor,
    }),
  }),
  text: z.object({
    font: z.string().min(1).max(100),
    colors: z.object({
      primary: themeColor,
      placeholder: themeColor,
      disabled: themeColor.optional(),
    }),
  }),
  border: z.object({
    radius: z.object({
      default: z.number().nonnegative().max(1_000),
      small: z.number().nonnegative().max(1_000),
      large: z.number().nonnegative().max(1_000),
    }),
    colors: z.object({
      default: themeColor,
      weak: themeColor,
      disabled: themeColor.optional(),
    }),
  }),
  systemStatus: z.object({
    colors: z.object({
      success: themeColor,
      error: themeColor,
      warning: themeColor,
    }),
  }),
  surface: z.object({
    colors: z.object({
      appBackground: themeColor,
      surface1: themeColor,
      surface2: themeColor,
      surface3: themeColor,
    }),
  }),
}).describe(
  'Complete ToolJet theme definition. Store literal light/dark colors here (normally hex); components consume the generated var(--cc-<token>) values.'
);

function required(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} is required for this action.`);
  return encodeURIComponent(value);
}

function requireConfirm(confirm: boolean | undefined, action: string): void {
  if (confirm !== true) throw new Error(`${action} requires confirm:true after exact-target user approval.`);
}

function mergePayload(payload: Record<string, unknown> | undefined, defaults: Record<string, unknown>) {
  return { ...defaults, ...(payload ?? {}) };
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

export function platformCoreTools(client: ToolJetClient): ToolDef[] {
  const permissionGroup = actionTool(
    client,
    'manage_permission_group',
    'Discover existing permission groups needed when assigning app or datasource access. Actions: list, get, list_users. ' +
      'Group creation, membership, role changes, and deletion are outside the app-builder scope.',
    {
      action: z.enum(['list', 'get', 'list_users']),
      group_id: nonEmpty.optional(),
      search: z.string().optional(),
    },
    async (args) => {
      const base = '/api/v2/group-permissions';
      if (args.action === 'list') return client.apiRequest({ operation: 'listPermissionGroups', path: base });
      const id = required(args.group_id, 'group_id');
      if (args.action === 'get') return client.apiRequest({ operation: 'getPermissionGroup', path: `${base}/${id}` });
      return client.apiRequest({ operation: 'listGroupUsers', path: `${base}/${id}/users`, query: { input: args.search ?? '' } });
    }
  );

  const granularPermission = actionTool(
    client,
    'manage_granular_permission',
    'Manage app and datasource permissions assigned to a permission group. Actions: list, list_addable_apps, ' +
      'list_addable_datasources, create, update, delete. Every grant, update, or revoke requires confirm:true.',
    {
      action: z.enum(['list', 'list_addable_apps', 'list_addable_datasources', 'create', 'update', 'delete']),
      group_id: nonEmpty.optional(),
      permission_id: nonEmpty.optional(),
      resource_type: granularType.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const base = '/api/v2/group-permissions';
      if (args.action === 'list_addable_apps') return client.apiRequest({ operation: 'listAddablePermissionApps', path: `${base}/granular-permissions/addable-apps` });
      if (args.action === 'list_addable_datasources') return client.apiRequest({ operation: 'listAddablePermissionDatasources', path: `${base}/granular-permissions/addable-data-sources` });
      if (args.action === 'list') {
        const id = required(args.group_id, 'group_id');
        return client.apiRequest({ operation: 'listGranularPermissions', path: `${base}/${id}/granular-permissions` });
      }
      if (!args.resource_type) throw new Error('resource_type is required for create, update, and delete.');
      requireConfirm(args.confirm, `${args.action} granular ${args.resource_type} permission`);
      const routeType = args.resource_type === 'app' ? 'app' : 'data-source';
      if (args.action === 'create') {
        const id = required(args.group_id, 'group_id');
        return client.apiRequest({ operation: 'createGranularPermission', path: `${base}/${id}/granular-permissions/${routeType}`, method: 'POST', body: mergePayload(args.payload, { type: args.resource_type }) });
      }
      const permissionId = required(args.permission_id, 'permission_id');
      return client.apiRequest({
        operation: `${args.action}GranularPermission`, path: `${base}/granular-permissions/${routeType}/${permissionId}`,
        method: args.action === 'update' ? 'PUT' : 'DELETE', body: args.action === 'update' ? args.payload ?? {} : undefined,
      });
    }
  );

  const appPermission = actionTool(
    client,
    'manage_app_permission',
    'Manage page, query, and component permissions. Actions: list_users, list_groups, get, create, update, delete. ' +
      'Every permission grant, update, or delete requires confirm:true. Native permission DTOs go in payload.',
    {
      action: z.enum(['list_users', 'list_groups', 'get', 'create', 'update', 'delete']),
      app_id: nonEmpty,
      resource_type: resourceType.optional(),
      resource_id: nonEmpty.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const appId = required(args.app_id, 'app_id');
      const base = `/api/app-permissions/${appId}`;
      if (args.action === 'list_users') return client.apiRequest({ operation: 'listAppPermissionUsers', path: `${base}/pages/users` });
      if (args.action === 'list_groups') return client.apiRequest({ operation: 'listAppPermissionGroups', path: `${base}/pages/user-groups` });
      if (!args.resource_type) throw new Error('resource_type is required.');
      const plural = args.resource_type === 'query' ? 'queries' : `${args.resource_type}s`;
      const resourceId = required(args.resource_id, 'resource_id');
      const path = `${base}/${plural}/${resourceId}`;
      if (args.action === 'get') return client.apiRequest({ operation: 'getAppPermission', path });
      requireConfirm(args.confirm, `${args.action} ${args.resource_type} permission ${args.resource_id}`);
      const method = args.action === 'create' ? 'POST' : args.action === 'update' ? 'PUT' : 'DELETE';
      return client.apiRequest({ operation: `${args.action}AppPermission`, path, method, body: method === 'DELETE' ? undefined : args.payload ?? {} });
    }
  );

  const theme = actionTool(
    client,
    'manage_theme',
    'Manage workspace themes. Actions: list, create, set_default, update_definition, rename, delete. ' +
      'Create and update_definition require the complete brand/text/border/systemStatus/surface definition. ' +
      'Definition colors are literal light/dark values; app component styles should use the generated semantic ' +
      'variables such as var(--cc-primary-brand). Changing the workspace default or deleting a theme requires ' +
      'confirm:true. Select a theme for one app with update_app_settings(theme_id).',
    {
      action: z.enum(['list', 'create', 'set_default', 'update_definition', 'rename', 'delete']),
      theme_id: nonEmpty.optional(),
      name: z.string().trim().min(5).max(100).optional(),
      definition: themeDefinition.optional(),
      is_default: z.boolean().optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') return client.apiRequest({ operation: 'listThemes', path: '/api/themes' });
      if (args.action === 'create') {
        if (!args.name) throw new Error('name is required for create.');
        if (!args.definition) throw new Error('definition is required for create.');
        return client.apiRequest({
          operation: 'createTheme', path: '/api/themes', method: 'POST',
          body: {
            name: args.name,
            definition: args.definition,
            organizationId: await client.getActiveWorkspaceId(),
            isDefault: args.is_default ?? false,
          },
        });
      }
      const id = required(args.theme_id, 'theme_id');
      if (args.action === 'delete' || args.action === 'set_default') {
        requireConfirm(args.confirm, `${args.action.replace('_', ' ')} theme ${args.theme_id}`);
      }
      const suffix = args.action === 'set_default' ? 'default' : args.action === 'update_definition' ? 'definition' : args.action === 'rename' ? 'name' : '';
      if (args.action === 'update_definition' && !args.definition) {
        throw new Error('definition is required for update_definition.');
      }
      if (args.action === 'rename' && !args.name) throw new Error('name is required for rename.');
      const body = args.action === 'set_default' ? { isDefault: args.is_default ?? true }
        : args.action === 'update_definition' ? { definition: args.definition }
        : args.action === 'rename' ? { name: args.name } : undefined;
      return client.apiRequest({ operation: `${args.action}Theme`, path: `/api/themes/${id}${suffix ? `/${suffix}` : ''}`, method: args.action === 'delete' ? 'DELETE' : 'PATCH', body });
    }
  );

  const app = actionTool(
    client,
    'manage_app_resource',
    'Manage apps, workflows, and modules outside the canvas. Actions: list, list_addable, get, get_by_slug, get_auth_config, ' +
      'list_tables, list_workflows, create, update, set_visibility, set_maintenance, set_slug, set_icon, release, clone, export, ' +
      'import, delete. Release, public visibility, and delete require confirm:true.',
    {
      action: z.enum(['list', 'list_addable', 'get', 'get_by_slug', 'get_auth_config', 'list_tables', 'list_workflows', 'create', 'update', 'set_visibility', 'set_maintenance', 'set_slug', 'set_icon', 'release', 'clone', 'export', 'import', 'delete']),
      resource_type: z.enum(['front-end', 'workflow', 'module']).default('front-end'),
      app_id: nonEmpty.optional(),
      name: z.string().optional(),
      slug: z.string().optional(),
      icon: z.any().optional(),
      value: z.boolean().optional(),
      payload: record.optional(),
      query: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const resourceBase = args.resource_type === 'module' ? '/api/modules' : '/api/apps';
      const createBase = args.resource_type === 'module' ? '/api/modules' : args.resource_type === 'workflow' ? '/api/workflows' : '/api/apps';
      if (args.action === 'list') return client.apiRequest({ operation: 'listApps', path: '/api/apps', query: { type: args.resource_type, ...args.query } });
      if (args.action === 'list_addable') return client.apiRequest({ operation: 'listAddableApps', path: '/api/apps/addable' });
      if (args.action === 'get_by_slug') return client.apiRequest({ operation: 'getAppBySlug', path: `/api/apps/slugs/${required(args.slug, 'slug')}` });
      if (args.action === 'get_auth_config') return client.apiRequest({ operation: 'getAppAuthenticationConfig', path: `/api/apps/app-authentication-config/${required(args.slug, 'slug')}` });
      if (args.action === 'create') return client.apiRequest({ operation: 'createAppResource', path: createBase, method: 'POST', body: mergePayload(args.payload, { name: args.name, type: args.resource_type }) });
      if (['clone', 'export', 'import'].includes(args.action)) {
        const route = args.resource_type === 'module' ? `/api/modules/${args.action}` : `/api/v2/resources/${args.action}`;
        return client.apiRequest({ operation: `${args.action}AppResource`, path: route, method: 'POST', body: args.payload ?? {} });
      }
      const id = required(args.app_id, 'app_id');
      if (args.action === 'get') return client.apiRequest({ operation: 'getAppResource', path: `${resourceBase}/${id}` });
      if (args.action === 'list_tables') return client.apiRequest({ operation: 'listAppTables', path: `/api/apps/${id}/tables` });
      if (args.action === 'list_workflows') return client.apiRequest({ operation: 'listAppWorkflows', path: `/api/apps/${id}/workflows` });
      if (args.action === 'delete') {
        requireConfirm(args.confirm, `delete ${args.resource_type} ${args.app_id}`);
        return client.apiRequest({ operation: 'deleteAppResource', path: `${resourceBase}/${id}`, method: 'DELETE' });
      }
      if (args.action === 'release') {
        requireConfirm(args.confirm, `release app ${args.app_id}`);
        return client.apiRequest({ operation: 'releaseApp', path: `/api/apps/${id}/release`, method: 'PUT', body: args.payload ?? {} });
      }
      if (args.action === 'set_visibility') {
        if (args.value === true) requireConfirm(args.confirm, `make app ${args.app_id} public`);
        return client.apiRequest({ operation: 'setAppVisibility', path: `/api/apps/${id}/public`, method: 'PUT', body: { app: mergePayload(args.payload, { is_public: args.value }) } });
      }
      if (args.action === 'set_icon') return client.apiRequest({ operation: 'setAppIcon', path: `/api/apps/${id}/icons`, method: 'PUT', body: { icon: args.icon } });
      const appPatch = args.action === 'set_maintenance' ? { is_maintenance_on: args.value } : args.action === 'set_slug' ? { slug: args.slug } : args.payload ?? {};
      return client.apiRequest({ operation: `${args.action}App`, path: `${resourceBase}/${id}`, method: 'PUT', body: { app: appPatch } });
    }
  );

  const folder = actionTool(
    client,
    'manage_folder',
    'Manage dashboard folders. Actions: list, create, rename, delete, add_app, remove_app. Delete requires confirm:true.',
    {
      action: z.enum(['list', 'create', 'rename', 'delete', 'add_app', 'remove_app']),
      folder_id: nonEmpty.optional(),
      app_id: nonEmpty.optional(),
      name: z.string().optional(),
      resource_type: z.enum(['front-end', 'workflow', 'module']).optional(),
      search: z.string().optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') return client.apiRequest({ operation: 'listFolders', path: '/api/folder-apps', query: { searchKey: args.search ?? '', type: args.resource_type ?? 'front-end' } });
      if (args.action === 'create') return client.apiRequest({ operation: 'createFolder', path: '/api/folders', method: 'POST', body: { name: args.name, type: args.resource_type ?? 'front-end' } });
      const folderId = required(args.folder_id, 'folder_id');
      if (args.action === 'rename') return client.apiRequest({ operation: 'renameFolder', path: `/api/folders/${folderId}`, method: 'PUT', body: { name: args.name } });
      if (args.action === 'delete') {
        requireConfirm(args.confirm, `delete folder ${args.folder_id}`);
        return client.apiRequest({ operation: 'deleteFolder', path: `/api/folders/${folderId}`, method: 'DELETE' });
      }
      const appId = required(args.app_id, 'app_id');
      return client.apiRequest({
        operation: `${args.action}FolderApp`, path: args.action === 'add_app' ? '/api/folder-apps' : `/api/folder-apps/${folderId}`,
        method: args.action === 'add_app' ? 'POST' : 'PUT', body: args.action === 'add_app' ? { folder_id: args.folder_id, app_id: args.app_id } : { app_id: appId },
      });
    }
  );

  const version = actionTool(
    client,
    'manage_app_version',
    'Manage app versions. Actions: list, get, create, create_draft, update, promote, delete. Promote/delete require confirm:true.',
    {
      action: z.enum(['list', 'get', 'create', 'create_draft', 'update', 'promote', 'delete']),
      app_id: nonEmpty,
      version_id: nonEmpty.optional(),
      payload: record.optional(),
      query: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const appId = required(args.app_id, 'app_id');
      const base = `/api/apps/${appId}`;
      if (args.action === 'list') return client.apiRequest({ operation: 'listAppVersions', path: `${base}/versions` });
      if (args.action === 'create') return client.apiRequest({ operation: 'createAppVersion', path: `${base}/versions`, method: 'POST', body: args.payload ?? {} });
      if (args.action === 'create_draft') return client.apiRequest({ operation: 'createDraftAppVersion', path: `${base}/draft-versions`, method: 'POST', body: args.payload ?? {} });
      const versionId = required(args.version_id, 'version_id');
      if (args.action === 'get') return client.apiRequest({ operation: 'getAppVersion', path: `/api/v2/apps/${appId}/versions/${versionId}`, query: args.query });
      if (args.action === 'update') return client.apiRequest({ operation: 'updateAppVersion', path: `/api/v2/apps/${appId}/versions/${versionId}`, method: 'PUT', body: args.payload ?? {} });
      requireConfirm(args.confirm, `${args.action} version ${args.version_id}`);
      if (args.action === 'promote') return client.apiRequest({ operation: 'promoteAppVersion', path: `/api/v2/apps/${appId}/versions/${versionId}/promote`, method: 'PUT', body: args.payload ?? {} });
      return client.apiRequest({ operation: 'deleteAppVersion', path: `${base}/versions/${versionId}`, method: 'DELETE' });
    }
  );

  const environment = actionTool(
    client,
    'manage_app_environment',
    'Manage app environments. Actions: list, get, get_default, list_versions, create, update, delete. Delete requires confirm:true.',
    {
      action: z.enum(['list', 'get', 'get_default', 'list_versions', 'create', 'update', 'delete']),
      app_id: nonEmpty.optional(),
      version_id: nonEmpty.optional(),
      environment_id: nonEmpty.optional(),
      name: z.string().optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') return client.apiRequest({ operation: 'listAppEnvironments', path: '/api/app-environments', query: { app_id: args.app_id } });
      if (args.action === 'get_default') return client.apiRequest({ operation: 'getDefaultAppEnvironment', path: '/api/app-environments/default' });
      if (args.action === 'create') {
        const versionId = required(args.version_id, 'version_id');
        return client.apiRequest({ operation: 'createAppEnvironment', path: `/api/app-environments/${versionId}`, method: 'POST', body: mergePayload(args.payload, { name: args.name }) });
      }
      const environmentId = required(args.environment_id, 'environment_id');
      if (args.action === 'get') return client.apiRequest({ operation: 'getAppEnvironment', path: `/api/app-environments/${environmentId}` });
      if (args.action === 'list_versions') return client.apiRequest({ operation: 'listEnvironmentVersions', path: `/api/app-environments/${environmentId}/versions`, query: { app_id: args.app_id } });
      const versionId = required(args.version_id, 'version_id');
      if (args.action === 'delete') requireConfirm(args.confirm, `delete environment ${args.environment_id}`);
      return client.apiRequest({ operation: `${args.action}AppEnvironment`, path: `/api/app-environments/${versionId}/${environmentId}`, method: args.action === 'update' ? 'PUT' : 'DELETE', body: args.action === 'update' ? mergePayload(args.payload, { name: args.name }) : undefined });
    }
  );

  const history = actionTool(
    client,
    'manage_app_history',
    'Inspect and restore app history. Actions: list, update_description, restore. Restore requires confirm:true.',
    {
      action: z.enum(['list', 'update_description', 'restore']),
      version_id: nonEmpty.optional(),
      history_id: nonEmpty.optional(),
      page: z.number().int().nonnegative().optional(),
      limit: z.number().int().positive().max(100).optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') {
        const versionId = required(args.version_id, 'version_id');
        return client.apiRequest({ operation: 'listAppHistory', path: `/api/app-history/apps/versions/${versionId}`, query: { page: args.page ?? 0, limit: args.limit ?? 20 } });
      }
      const historyId = required(args.history_id, 'history_id');
      if (args.action === 'restore') requireConfirm(args.confirm, `restore history entry ${args.history_id}`);
      return client.apiRequest({ operation: `${args.action}AppHistory`, path: `/api/app-history/${historyId}${args.action === 'restore' ? '/restore' : ''}`, method: args.action === 'restore' ? 'POST' : 'PATCH', body: args.payload });
    }
  );

  const settings = actionTool(
    client,
    'manage_raw_app_settings',
    'Read or update native version settings not covered by update_app_settings, including libraries, preloadedScript, ' +
      'page styles, device flags, and showViewerNavigation. Actions: get, update. Payload uses native AppVersionUpdateDto.',
    {
      action: z.enum(['get', 'update']),
      app_id: nonEmpty,
      version_id: nonEmpty,
      payload: record.optional(),
    },
    async (args) => {
      const appId = required(args.app_id, 'app_id');
      const versionId = required(args.version_id, 'version_id');
      return client.apiRequest({ operation: `${args.action}RawAppSettings`, path: `/api/v2/apps/${appId}/versions/${versionId}`, method: args.action === 'update' ? 'PUT' : 'GET', body: args.action === 'update' ? args.payload ?? {} : undefined });
    }
  );

  const navigation = actionTool(
    client,
    'manage_navigation_item',
    'Manage advanced pages/navigation items: normal pages, URL/custom/app links, nav groups, handles, grouping, cloning, ' +
      'reordering, and deletion. Actions: create, update, clone, clone_group, reorder, delete. Delete requires confirm:true.',
    {
      action: z.enum(['create', 'update', 'clone', 'clone_group', 'reorder', 'delete']),
      app_id: nonEmpty,
      version_id: nonEmpty,
      page_id: nonEmpty.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const appId = required(args.app_id, 'app_id');
      const versionId = required(args.version_id, 'version_id');
      const base = `/api/v2/apps/${appId}/versions/${versionId}/pages`;
      if (args.action === 'create') return client.apiRequest({ operation: 'createNavigationItem', path: base, method: 'POST', body: args.payload ?? {} });
      if (args.action === 'update') return client.apiRequest({ operation: 'updateNavigationItem', path: base, method: 'PUT', body: args.payload ?? {} });
      if (args.action === 'reorder') return client.apiRequest({ operation: 'reorderNavigationItems', path: `${base}/reorder`, method: 'PUT', body: args.payload ?? {} });
      if (args.action === 'delete') {
        requireConfirm(args.confirm, `delete navigation item ${args.page_id ?? ''}`);
        return client.apiRequest({ operation: 'deleteNavigationItem', path: base, method: 'DELETE', body: mergePayload(args.payload, { pageId: args.page_id }) });
      }
      const pageId = required(args.page_id, 'page_id');
      return client.apiRequest({ operation: `${args.action}NavigationItem`, path: `${base}/${pageId}/${args.action === 'clone_group' ? 'clone-group' : 'clone'}`, method: 'POST' });
    }
  );

  return [permissionGroup, granularPermission, appPermission, theme, app, folder, version, environment, history, settings, navigation];
}
