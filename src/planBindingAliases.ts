import type { AppPlanInput } from './appPlanSchema.js';
import type { AppSummary } from './tooljetClient.js';
import { namespaceReads } from './runjsReferences.js';

type Namespace = 'components' | 'queries';
type BindingPlan = Omit<AppPlanInput, 'pages'> & {
  pages?: Array<{ components?: NonNullable<AppPlanInput['pages']>[number]['components'] }>;
};

/** Only aliases explicitly declared in this exact plan are eligible. Existing runtime names win;
 * ambiguous aliases/names, dynamic access, shadowed namespaces and invalid JS are never guessed.
 * Mutates only executable value fields of the plan that will be validated AND stored for apply.
 */
export function normalizePlanBindingAliases(
  plan: BindingPlan,
  existing?: Pick<AppSummary, 'pages' | 'queries'>,
  datasourceKinds: Map<string, string> = new Map(),
  datasourceNames: Map<string, string> = new Map(),
): string[] {
  const components = (plan.pages ?? []).flatMap(page => page.components ?? []);
  const aliases = (items: Array<{ name: string; client_ref?: string }>, savedNames: string[]) => {
    const counts = new Map<string, number>();
    for (const name of [...savedNames, ...items.map(item => item.name)]) counts.set(name, (counts.get(name) ?? 0) + 1);
    const candidates = new Map<string, string[]>();
    for (const item of items) if (item.client_ref && item.client_ref !== item.name) {
      candidates.set(item.client_ref, [...(candidates.get(item.client_ref) ?? []), item.name]);
    }
    return new Map([...candidates].flatMap(([alias, names]) =>
      names.length === 1 && !counts.has(alias) && counts.get(names[0]!) === 1 ? [[alias, names[0]!] as const] : []));
  };
  const maps = {
    components: aliases(components, (existing?.pages ?? []).flatMap(page => page.components.flatMap(c => c.name ? [c.name] : []))),
    queries: aliases(plan.queries ?? [], (existing?.queries ?? []).flatMap(q => q.name ? [q.name] : [])),
  };
  const changed = new Set<string>();
  const rewrite = (code: string): string => {
    const edits = (['components', 'queries'] as Namespace[]).flatMap(namespace =>
      namespaceReads(code, namespace).flatMap(read => {
        const target = maps[namespace].get(read.name);
        if (!target) return [];
        changed.add(`${namespace}[${JSON.stringify(read.name)}] → ${namespace}[${JSON.stringify(target)}]`);
        return [{ ...read, text: `${namespace}${read.optional ? '?.' : ''}[${JSON.stringify(target)}]` }];
      }));
    for (const edit of edits.sort((a, b) => b.start - a.start)) code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
    return code;
  };
  const values = (value: unknown): unknown => {
    if (typeof value === 'string') return value.replace(/\{\{([\s\S]*?)\}\}/g, (whole, body: string) => {
      const source = `(${body})`;
      const normalized = rewrite(source);
      return source === normalized ? whole : `{{${normalized.slice(1, -1)}}}`;
    });
    if (Array.isArray(value)) return value.map(values);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, values(child)]));
    return value;
  };
  for (const component of components) {
    for (const section of ['properties', 'styles', 'validation', 'others'] as const) {
      if (component[section]) component[section] = values(component[section]) as Record<string, unknown>;
    }
  }
  for (const query of plan.queries ?? []) {
    const kind = datasourceKinds.get(query.datasource_id ?? '') ?? datasourceNames.get(query.datasource_name ?? '') ?? query.kind;
    const originalCode = query.options.code;
    const hasCode = Object.hasOwn(query.options, 'code');
    const { code: _code, ...otherOptions } = query.options;
    query.options = values(kind === 'runjs' ? otherOptions : query.options) as Record<string, unknown>;
    // Plain RunJS is code, not interpolation: do not rewrite {{ }} inside its string examples.
    if (kind === 'runjs' && hasCode) {
      query.options.code = typeof originalCode === 'string' ? rewrite(originalCode) : originalCode;
    }
  }
  for (const event of plan.events ?? []) event.action = values(event.action) as Record<string, unknown>;
  for (const lifecycle of plan.lifecycles ?? []) {
    for (const key of ['before_refresh_actions', 'success_actions', 'failure_actions'] as const) {
      if (lifecycle[key]) lifecycle[key] = values(lifecycle[key]) as Array<Record<string, unknown>>;
    }
    for (const key of ['success_alert', 'failure_alert'] as const) {
      if (lifecycle[key]) lifecycle[key] = values(lifecycle[key]) as typeof lifecycle[typeof key];
    }
  }
  return [...changed].map(change => `Resolved explicit binding alias ${change}; the submitted definitions now use the runtime name. No inferred names were rewritten.`);
}
