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

export function platformWorkflowOpsTools(client: ToolJetClient): ToolDef[] {
  const execution = actionTool(
    client,
    'manage_workflow_execution',
    'Run and inspect ToolJet workflows. Actions: create, list, list_all, get, status, nodes, states, preview_query_node, ' +
      'trigger, terminate. Every execution/preview/trigger/terminate action requires confirm:true because workflows can cause side effects.',
    {
      action: z.enum(['create', 'list', 'list_all', 'get', 'status', 'nodes', 'states', 'preview_query_node', 'trigger', 'terminate']),
      workflow_id: nonEmpty.optional(),
      version_id: nonEmpty.optional(),
      execution_id: nonEmpty.optional(),
      page: z.number().int().positive().optional(),
      per_page: z.number().int().positive().max(100).optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') return client.apiRequest({ operation: 'listWorkflowExecutions', path: '/api/workflow_executions', query: { appVersionId: args.version_id, page: args.page, per_page: args.per_page } });
      if (args.action === 'list_all') return client.apiRequest({ operation: 'listAllWorkflowExecutions', path: `/api/workflow_executions/all/${required(args.version_id, 'version_id')}` });
      if (args.action === 'states') return client.apiRequest({ operation: 'getWorkflowExecutionStates', path: '/api/workflow_executions/states', method: 'POST', query: { appVersionId: args.version_id }, body: args.payload ?? {} });
      if (args.action === 'get' || args.action === 'status' || args.action === 'nodes') {
        const id = required(args.execution_id, 'execution_id');
        const suffix = args.action === 'get' ? '' : `/${args.action}`;
        return client.apiRequest({ operation: `${args.action}WorkflowExecution`, path: `/api/workflow_executions/${id}${suffix}`, query: args.action === 'nodes' ? { page: args.page, per_page: args.per_page } : undefined });
      }
      requireConfirm(args.confirm, args.action.replaceAll('_', ' '));
      if (args.action === 'create') return client.apiRequest({ operation: 'createWorkflowExecution', path: '/api/workflow_executions', method: 'POST', body: args.payload ?? {} });
      if (args.action === 'preview_query_node') return client.apiRequest({ operation: 'previewWorkflowQueryNode', path: '/api/workflow_executions/previewQueryNode', method: 'POST', body: args.payload ?? {} });
      if (args.action === 'trigger') {
        const id = required(args.workflow_id ?? args.version_id, 'workflow_id or version_id');
        return client.apiRequest({ operation: 'triggerWorkflowExecution', path: `/api/workflow_executions/${id}/trigger`, method: 'POST', body: args.payload ?? {} });
      }
      const executionId = required(args.execution_id, 'execution_id');
      return client.apiRequest({ operation: 'terminateWorkflowExecution', path: `/api/workflow_executions/${executionId}/terminate`, method: 'DELETE' });
    }
  );

  const webhook = actionTool(
    client,
    'manage_workflow_webhook',
    'Manage and invoke workflow webhooks. Actions: enable, trigger, trigger_async, status, terminate. ' +
      'Enable/trigger/terminate actions require confirm:true.',
    {
      action: z.enum(['enable', 'trigger', 'trigger_async', 'status', 'terminate']),
      workflow_id_or_name: nonEmpty,
      execution_id: nonEmpty.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const workflow = required(args.workflow_id_or_name, 'workflow_id_or_name');
      const base = `/api/v2/webhooks/workflows/${workflow}`;
      if (args.action === 'status') return client.apiRequest({ operation: 'getWorkflowWebhookStatus', path: `${base}/status/${required(args.execution_id, 'execution_id')}` });
      requireConfirm(args.confirm, `${args.action} workflow webhook ${args.workflow_id_or_name}`);
      if (args.action === 'enable') return client.apiRequest({ operation: 'enableWorkflowWebhook', path: base, method: 'PATCH', body: args.payload ?? {} });
      if (args.action === 'terminate') return client.apiRequest({ operation: 'terminateWorkflowWebhookExecution', path: `${base}/execution/${required(args.execution_id, 'execution_id')}/terminate`, method: 'DELETE' });
      return client.apiRequest({ operation: `${args.action}WorkflowWebhook`, path: `${base}/${args.action === 'trigger_async' ? 'trigger-async' : 'trigger'}`, method: 'POST', body: args.payload ?? {} });
    }
  );

  const schedule = actionTool(
    client,
    'manage_workflow_schedule',
    'Manage workflow schedules. Actions: list, get, create, update, activate, delete. Create/update/activate/delete require confirm:true.',
    {
      action: z.enum(['list', 'get', 'create', 'update', 'activate', 'delete']),
      app_id: nonEmpty.optional(),
      schedule_id: nonEmpty.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') return client.apiRequest({ operation: 'listWorkflowSchedules', path: '/api/workflow-schedules', query: { app_id: args.app_id } });
      if (args.action === 'get') return client.apiRequest({ operation: 'getWorkflowSchedule', path: `/api/workflow-schedules/${required(args.schedule_id, 'schedule_id')}` });
      requireConfirm(args.confirm, `${args.action} workflow schedule`);
      if (args.action === 'create') return client.apiRequest({ operation: 'createWorkflowSchedule', path: '/api/workflow-schedules', method: 'POST', body: args.payload ?? {} });
      const id = required(args.schedule_id, 'schedule_id');
      return client.apiRequest({ operation: `${args.action}WorkflowSchedule`, path: args.action === 'activate' ? `/api/workflow-schedules/activate/${id}` : `/api/workflow-schedules/${id}`, method: args.action === 'delete' ? 'DELETE' : 'PUT', body: args.action === 'delete' ? undefined : args.payload ?? {} });
    }
  );

  const workflowPackage = actionTool(
    client,
    'manage_workflow_package',
    'Manage workflow JavaScript/Python packages. Actions: search, details, versions, list_installed, update, build_status, rebuild. ' +
      'Update/rebuild require confirm:true.',
    {
      action: z.enum(['search', 'details', 'versions', 'list_installed', 'update', 'build_status', 'rebuild']),
      version_id: nonEmpty.optional(),
      language: z.enum(['javascript', 'python']).default('javascript'),
      package_name: nonEmpty.optional(),
      search: z.string().optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      const language = encodeURIComponent(args.language);
      if (args.action === 'search') return client.apiRequest({ operation: 'searchWorkflowPackages', path: `/api/workflows/packages/${language}/search`, query: { q: args.search ?? '', limit: 50 } });
      if (args.action === 'details' || args.action === 'versions') {
        const name = required(args.package_name, 'package_name');
        return client.apiRequest({ operation: `${args.action}WorkflowPackage`, path: `/api/workflows/packages/${language}/${name}${args.action === 'versions' ? '/versions' : ''}` });
      }
      const version = required(args.version_id, 'version_id');
      const base = `/api/workflows/${version}`;
      if (args.action === 'list_installed') return client.apiRequest({ operation: 'listInstalledWorkflowPackages', path: `${base}/packages/${language}` });
      if (args.action === 'build_status') return client.apiRequest({ operation: 'getWorkflowBundleStatus', path: `${base}/bundle/${language}/status` });
      requireConfirm(args.confirm, `${args.action} workflow packages`);
      return client.apiRequest({ operation: `${args.action}WorkflowPackages`, path: args.action === 'update' ? `${base}/packages/${language}` : `${base}/bundle/${language}/rebuild`, method: args.action === 'update' ? 'PUT' : 'POST', body: args.payload ?? {} });
    }
  );

  const module = actionTool(
    client,
    'manage_module_resource',
    'Manage reusable ToolJet modules. Actions: create, update, delete, export, import, clone. Import, clone, and delete ' +
      'require confirm:true.',
    {
      action: z.enum(['create', 'update', 'delete', 'export', 'import', 'clone']),
      module_id: nonEmpty.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'create') return client.apiRequest({ operation: 'createModule', path: '/api/modules', method: 'POST', body: args.payload ?? {} });
      if (['export', 'import', 'clone'].includes(args.action)) {
        if (args.action !== 'export') requireConfirm(args.confirm, `${args.action} module`);
        return client.apiRequest({ operation: `${args.action}Module`, path: `/api/modules/${args.action}`, method: 'POST', body: args.payload ?? {} });
      }
      const id = required(args.module_id, 'module_id');
      if (args.action === 'delete') requireConfirm(args.confirm, `delete module ${args.module_id}`);
      return client.apiRequest({ operation: `${args.action}Module`, path: `/api/modules/${id}`, method: args.action === 'update' ? 'PUT' : 'DELETE', body: args.action === 'update' ? args.payload ?? {} : undefined });
    }
  );

  const template = actionTool(
    client,
    'manage_template',
    'Use ToolJet template-library resources for app creation. Actions: list, deploy, dependent_plugins. ' +
      'Deploy requires confirm:true.',
    {
      action: z.enum(['list', 'deploy', 'dependent_plugins']),
      identifier: nonEmpty.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'list') return client.apiRequest({ operation: 'listTemplates', path: '/api/library_apps' });
      if (args.action === 'dependent_plugins') return client.apiRequest({ operation: 'getTemplateDependentPlugins', path: `/api/library_apps/${required(args.identifier, 'identifier')}/plugins` });
      requireConfirm(args.confirm, 'deploy template');
      return client.apiRequest({ operation: 'deployTemplate', path: '/api/library_apps', method: 'POST', body: args.payload ?? {} });
    }
  );

  const customStyles = actionTool(
    client,
    'manage_custom_styles',
    'Read or update workspace custom CSS. Actions: get, get_app, get_public_app, save. Save requires confirm:true.',
    {
      action: z.enum(['get', 'get_app', 'get_public_app', 'save']),
      app_slug: nonEmpty.optional(),
      payload: record.optional(),
      confirm: z.boolean().optional(),
    },
    async (args) => {
      if (args.action === 'get') return client.apiRequest({ operation: 'getCustomStyles', path: '/api/custom-styles' });
      if (args.action === 'get_app') return client.apiRequest({ operation: 'getAppCustomStyles', path: '/api/custom-styles/app' });
      if (args.action === 'get_public_app') return client.apiRequest({ operation: 'getPublicAppCustomStyles', path: `/api/custom-styles/${required(args.app_slug, 'app_slug')}` });
      requireConfirm(args.confirm, 'save custom styles');
      return client.apiRequest({ operation: 'saveCustomStyles', path: '/api/custom-styles', method: 'POST', body: args.payload ?? {} });
    }
  );

  return [execution, webhook, schedule, workflowPackage, module, template, customStyles];
}
