import { z } from 'zod';
const id = z.string().uuid();
const data = z.record(z.string(), z.unknown());
const page = { page: z.number().int().min(1).default(1), per_page: z.number().int().min(1).max(50).default(20) };
const scope = { app_id: id.optional(), folder_id: id.optional(), environment_id: id.optional() };
const dates = { from: z.string().optional(), to: z.string().optional() };
const language = z.enum(['javascript', 'python']);
const schedule = {
  name: z.string().trim().min(1).max(100),
  workflowId: id,
  environmentId: id,
  type: z.enum(['interval', 'cron']),
  timezone: z.string().min(1),
  details: z
    .object({
      frequency: z.enum(['minute', 'hour', 'day', 'week', 'month']).optional(),
      minutes: z.union([z.number(), z.string()]).optional().describe('Minute within each hour, for frequency hour.'),
      hour: z.string().optional().describe('Time such as 9:30 AM, for day/week/month.'),
      day: z.string().optional().describe('Weekday name for weekly schedules.'),
      date: z.union([z.number(), z.string()]).optional(),
      minute: z.string().optional(),
      hours: z.string().optional(),
      dayOfMonth: z.string().optional(),
      month: z.string().optional(),
      dayOfWeek: z.string().optional(),
    })
    .strict()
    .describe(
      'Interval: frequency minute runs every minute; hour also needs minutes; day/week/month need hour and day/date as applicable. Cron: all five fields minute, hours, dayOfMonth, month, dayOfWeek.',
    ),
  params: data.nullable().optional(),
};
const encoded = (value: unknown) => encodeURIComponent(String(value));
const query = (values: Record<string, unknown>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined) {
      for (const entry of Array.isArray(value) ? value : [value]) search.append(key, String(entry));
    }
  return search.toString();
};
type Operation = {
  description: string;
  schema: z.ZodObject<any>;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: (args: any) => string;
  body?: (args: any) => unknown;
  execution?: boolean;
  draft?: boolean;
};
export const workflowOperations = {
  list_workflow_executions: {
    description: 'List workspace execution history with filters and pagination.',
    schema: z
      .object({
        ...page,
        ...scope,
        ...dates,
        status: z.array(z.enum(['running', 'waiting', 'success', 'failed', 'terminated'])).optional(),
        trigger: z.array(z.enum(['manual', 'schedule', 'webhook', 'app', 'workflow', 'unknown'])).optional(),
      })
      .strict(),
    method: 'GET',
    path: (a: any) => `/api/workflow_executions/workspace?${query(a)}`,
  },
  get_workflow_execution_states: {
    description: 'Read queue and termination state for selected runs.',
    schema: z.object({ execution_ids: z.array(id).min(1).max(100) }).strict(),
    method: 'POST',
    path: () => '/api/workflow_executions/workspace/states',
    body: (a: any) => ({ executionIds: a.execution_ids }),
  },
  stop_workflow_execution: {
    description:
      'Request termination of one run. Cancels pending waits and approvals. Use only when stopping that run is requested.',
    schema: z.object({ execution_id: id }).strict(),
    method: 'DELETE',
    path: (a: any) => `/api/workflow_executions/${a.execution_id}/terminate`,
    body: () => ({}),
  },
  list_workflow_consumers: {
    description: 'List apps and workflows that reference this workflow.',
    schema: z.object({ workflow_id: id }).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflows/${a.workflow_id}/consumers`,
  },
  list_workflow_schedules: {
    description: 'List schedules for a workflow, including pinned versions and input overrides.',
    schema: z
      .object({
        app_id: id,
        page: page.page,
        limit: z.number().int().min(1).max(50).default(20),
        search: z.string().optional(),
        environment_id: id.optional(),
        workflow_id: id.optional(),
      })
      .strict(),
    method: 'GET',
    path: (a: any) => `/api/workflow-schedules?${query(a)}`,
  },
  get_workflow_schedule: {
    description: 'Read one schedule.',
    schema: z.object({ schedule_id: id }).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflow-schedules/${a.schedule_id}`,
  },
  create_workflow_schedule: {
    description:
      'Create a schedule pinned to workflowId (a VERSION ID). Defaults inactive. Activating authorizes repeated workflow execution and its effects.',
    schema: z.object({ ...schedule, workflow_id: id, active: z.boolean().default(false) }).strict(),
    method: 'POST',
    path: () => '/api/workflow-schedules',
    body: (a: any) => {
      const { workflow_id, ...body } = a;
      return body;
    },
    execution: true,
  },
  update_workflow_schedule: {
    description: 'Update a schedule. May change future executions; preserves omitted properties.',
    schema: z.object({ schedule_id: id, changes: z.object(schedule).partial().strict() }).strict(),
    method: 'PUT',
    path: (a: any) => `/api/workflow-schedules/${a.schedule_id}`,
    body: (a: any) => a.changes,
    execution: true,
  },
  set_workflow_schedule_active: {
    description: 'Activate or pause a schedule. Activation authorizes repeated executions and their effects.',
    schema: z.object({ schedule_id: id, active: z.boolean() }).strict(),
    method: 'PUT',
    path: (a: any) => `/api/workflow-schedules/activate/${a.schedule_id}`,
    body: (a: any) => ({ active: a.active }),
    execution: true,
  },
  delete_workflow_schedule: {
    description: 'Delete one schedule and remove its future jobs.',
    schema: z.object({ schedule_id: id }).strict(),
    method: 'DELETE',
    path: (a: any) => `/api/workflow-schedules/${a.schedule_id}`,
    body: () => ({}),
  },
  list_upcoming_workflow_runs: {
    description: 'List upcoming scheduled executions scoped to the workspace.',
    schema: z.object(scope).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflow_executions/workspace/upcoming?${query(a)}`,
  },
  list_workflow_approvals: {
    description: 'List approvals visible to the signed-in user. Approval tokens are not required.',
    schema: z
      .object({
        ...page,
        ...scope,
        ...dates,
        status: z.array(z.enum(['pending', 'resolved', 'expired', 'cancelled'])).optional(),
        approver: z.string().optional(),
      })
      .strict(),
    method: 'GET',
    path: (a: any) => `/api/workflow-approvals?${query(a)}`,
  },
  get_workflow_approval: {
    description:
      'Read an approval from its explicitly supplied approval-link token. Treat the token as a secret; do not log or share it.',
    schema: z.object({ token: id }).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflow-approvals/${a.token}`,
  },
  resolve_workflow_approval: {
    description:
      'Submit the user-selected outcome and form inputs as the signed-in approver. Resumes the workflow and its effects. Never decide an approval outcome without user instruction.',
    schema: z.object({ approval_id: id, outcome: z.string().min(1), input: data.default({}) }).strict(),
    method: 'POST',
    path: (a: any) => `/api/workflow-approvals/by-id/${a.approval_id}/resolve`,
    body: (a: any) => ({ outcome: a.outcome, input: a.input }),
    execution: true,
  },
  cancel_workflow_approval: {
    description: 'Cancel a pending approval and its workflow continuation.',
    schema: z.object({ approval_id: id }).strict(),
    method: 'POST',
    path: (a: any) => `/api/workflow-approvals/${a.approval_id}/cancel`,
    body: () => ({}),
  },
  set_workflow_webhook_enabled: {
    description:
      'Enable or disable webhook triggering on the current branch. Enabling allows external executions. Backend branch, license and permission checks remain enforced.',
    schema: z.object({ workflow_id: id, enabled: z.boolean() }).strict(),
    method: 'PATCH',
    path: (a: any) => `/api/v2/webhooks/workflows/${a.workflow_id}`,
    body: (a: any) => ({ isEnable: a.enabled ? 'endPointTrigger' : 'none' }),
    execution: true,
  },
  get_workflow_packages: {
    description: 'Read JavaScript dependencies or Python requirements for a version.',
    schema: z.object({ version_id: id, language }).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflows/${a.version_id}/packages/${a.language}`,
  },
  set_workflow_packages: {
    description:
      'Replace dependencies and start a bundle build. Package installation may execute build tooling; only install requested packages in an editable draft.',
    schema: z
      .object({
        workflow_id: id,
        version_id: id,
        language,
        dependencies: z.union([z.record(z.string(), z.string()), z.string()]),
      })
      .strict(),
    method: 'PUT',
    path: (a: any) => `/api/workflows/${a.version_id}/packages/${a.language}`,
    body: (a: any) => ({ dependencies: a.dependencies }),
    draft: true,
  },
  get_workflow_bundle_status: {
    description: 'Read dependency bundle build status.',
    schema: z.object({ version_id: id, language }).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflows/${a.version_id}/bundle/${a.language}/status`,
  },
  rebuild_workflow_bundle: {
    description: 'Rebuild the selected draft version dependency bundle.',
    schema: z.object({ workflow_id: id, version_id: id, language }).strict(),
    method: 'POST',
    path: (a: any) => `/api/workflows/${a.version_id}/bundle/${a.language}/rebuild`,
    body: () => ({}),
    draft: true,
  },
  search_workflow_packages: {
    description: 'Search the package registry for workflow dependencies.',
    schema: z.object({ language, q: z.string().min(1), limit: z.number().int().min(1).max(50).default(10) }).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflows/packages/${a.language}/search?${query({ q: a.q, limit: a.limit })}`,
  },
  get_workflow_package: {
    description: 'Read package metadata and available versions.',
    schema: z.object({ language, name: z.string().min(1) }).strict(),
    method: 'GET',
    path: (a: any) => `/api/workflows/packages/${a.language}/${encoded(a.name)}`,
  },
  preview_workflow_node: {
    description:
      'Execute a node preview against supplied state. Can run code and datasource writes; authorize those effects first.',
    schema: z
      .object({
        workflow_id: id,
        version_id: id,
        environment_id: id,
        node_id: id,
        query_id: id.optional(),
        state: data.default({}),
      })
      .strict(),
    method: 'POST',
    path: () => '/api/workflow_executions/previewQueryNode',
    body: (a: any) => ({
      appVersionId: a.version_id,
      appEnvId: a.environment_id,
      nodeId: a.node_id,
      queryId: a.query_id,
      state: a.state,
    }),
    execution: true,
  },
} satisfies Record<string, Operation>;
export type WorkflowOperationName = keyof typeof workflowOperations;
