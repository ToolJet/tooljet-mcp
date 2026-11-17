import { z } from 'zod';

export const workflowName = z.string().min(1).refine(value => value.trim().length > 0, 'Name must not be blank.');
const name = workflowName;
export const conditionBranches = z.array(z.object({ id: z.string().min(1), code: z.string().min(1), label: z.string() }).strict()).min(1);
export const elseBranch = z.object({ enabled: z.boolean(), label: z.string().optional() }).strict();
export const workflowInputs = z.array(z.object({
  key: name, type: z.enum(['string', 'number', 'object', 'array', 'boolean', 'null']),
  required: z.boolean(), defaultValue: z.unknown().optional(), description: z.string().optional(),
}).strict()).superRefine((inputs, ctx) => {
  const keys = new Set<string>();
  inputs.forEach((input, i) => {
    const canonicalKey = input.key.trim().toLowerCase();
    if (keys.has(canonicalKey)) ctx.addIssue({ code: 'custom', path: [i, 'key'], message: 'Duplicate workflow input.' });
    keys.add(canonicalKey);
    const value = input.defaultValue;
    if (value === undefined) return;
    const valid = input.type === 'null' ? value === null : input.type === 'array' ? Array.isArray(value)
      : input.type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : typeof value === input.type;
    if (!valid) ctx.addIssue({ code: 'custom', path: [i, 'defaultValue'], message: 'Default must match input type.' });
  });
});
export const humanConfig = {
  description: z.string().optional(),
  outcomes: z.array(z.object({ key: name, label: z.string().min(1) }).strict()).min(1),
  input_schema: z.array(z.object({ name, type: z.enum(['text', 'number', 'boolean', 'select']), label: z.string().optional(), required: z.boolean().optional(), options: z.array(z.string()).optional(), default: z.unknown().optional() }).strict()).optional(),
  approvers: z.object({ users: z.array(z.string().uuid()).optional(), groups: z.array(z.string().uuid()).optional(), dynamic: z.string().optional(), tokenBypass: z.boolean().optional() }).strict(),
  timeout: z.object({ enabled: z.boolean(), durationSeconds: z.number().finite().positive().optional(), onExpire: z.enum(['fail', 'branch']).optional(), timeoutOutcome: z.string().optional() }).strict().optional(),
  reminders: z.array(z.object({ id: z.string().optional(), afterSeconds: z.number().finite().min(1) }).strict()).optional(),
  notification: z.object({ url: z.string().optional(), method: z.string().optional(), headers: z.record(z.string(), z.string()).optional(), bodyTemplate: z.string().optional(), includeResolveUrl: z.boolean().optional() }).strict().optional(),
};

/** Validate the persisted configuration after applying a patch, including retained values. */
export function humanConfigurationErrors(data: Record<string, unknown>): string[] {
  const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const atLeastOneSecond = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 1;
  const errors: string[] = [];
  const outcomes = Array.isArray(data.outcomes) ? data.outcomes.map(record) : [];
  if (!outcomes.length || outcomes.some(outcome => typeof outcome.key !== 'string' || !outcome.key.trim())) errors.push('Human approval requires named outcomes.');
  if (new Set(outcomes.map(outcome => outcome.key)).size !== outcomes.length) errors.push('Human outcome keys must be unique.');
  const fields = Array.isArray(data.inputSchema) ? data.inputSchema.map(record) : [];
  if (fields.some(field => typeof field.name !== 'string' || !field.name.trim()) || new Set(fields.map(field => field.name)).size !== fields.length) errors.push('Human input field names must be nonblank and unique.');
  const timeout = record(data.timeout);
  if (timeout.enabled === true && !atLeastOneSecond(timeout.durationSeconds)) errors.push('Human timeout must be at least one second.');
  if (timeout.enabled === true && timeout.onExpire === 'branch' && !outcomes.some(outcome => outcome.key === timeout.timeoutOutcome)) errors.push('Human timeout must select an existing outcome.');
  const reminders = [...(Array.isArray(data.reminders) ? data.reminders : []), ...(Array.isArray(timeout.reminders) ? timeout.reminders : [])];
  if (reminders.some(reminder => !atLeastOneSecond(record(reminder).afterSeconds))) errors.push('Human reminders must be at least one second.');
  const approvers = record(data.approvers);
  const hasUsers = Array.isArray(approvers.users) && approvers.users.length > 0;
  const hasGroups = Array.isArray(approvers.groups) && approvers.groups.length > 0;
  const hasDynamic = typeof approvers.dynamic === 'string' && approvers.dynamic.trim().length > 0;
  if (approvers.tokenBypass === false && !hasUsers && !hasGroups && !hasDynamic) errors.push('Human requires an approver when token bypass is disabled.');
  return errors;
}

/** These checks also run on retained definitions, not just new spec entries. */
export function conditionHandles(data: Record<string, unknown>): string[] {
  const branches = data.conditions as Array<{ id: string }> | undefined;
  return Array.isArray(branches) && branches.length
    ? [...branches.map(branch => branch.id), 'false']
    : ['true', 'false'];
}
