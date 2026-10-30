import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Auth } from '../src/auth.js';
import type { AppPlanInput } from '../src/appPlanSchema.js';
import type { AppSpecLintResult } from '../src/appSpecLint.js';
import { clearAppPlansForTests, storeAppPlan } from '../src/appPlanStore.js';
import { createClient, type AppSummary } from '../src/tooljetClient.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { applyAppPhaseTool } from '../src/tools/applyAppPhase.js';
import { addComponentBatchesTool } from '../src/tools/addComponentBatches.js';

const rect = (top: number, height = 40, width = 20) => ({ top, left: 2, width, height });
const text = (result: { content: Array<{ text?: string }> }) => String(result.content[0]!.text);

// Keep the real component/event writers: stubbing createComponents would hide the lint/apply mismatch.
// HTTP is entirely local and records the exact DTOs that would be sent to ToolJet.
function appHarness() {
  const state: AppSummary = { app_id: 'studio', version_id: 'draft', name: 'Archive', pages: [], queries: [], events: [] };
  const writes: string[] = [];
  const http = vi.fn(async (url: string, init?: RequestInit) => {
    if (!init?.method || init.method === 'GET') throw new Error(`Unexpected read: ${url}`);
    writes.push(`${init.method} ${url}`);
    if (init.method === 'DELETE' && /\/events\//.test(url)) {
      state.events = state.events.filter(event => !url.endsWith(`/${event.id}`));
      return new Response('{}', { status: 200 });
    }
    const body = JSON.parse(String(init.body));
    if (url.endsWith('/components')) {
      const page = state.pages.find(p => p.id === body.pageId)!;
      if (init.method === 'DELETE') page.components = page.components.filter(c => !body.diff.includes(c.id));
      else for (const [id, component] of Object.entries(body.diff)) page.components.push({ id, ...(component as any) });
    } else if (url.endsWith('/events/bulk')) {
      state.events.push(...body.events.map((event: any, index: number) => ({
        id: `event-${index}`, sourceId: event.attachedTo, target: event.eventType, event: event.event, index: event.index,
      })));
    } else throw new Error(`Unexpected write: ${url}`);
    return new Response('{}', { status: 200 });
  });
  const auth = { authedFetch: http, getOrganizationId: vi.fn(), getOrganizationSlug: vi.fn() } as Auth;
  const client = createClient(auth, { apiUrl: 'https://tooljet.example.test', appUrl: 'https://tooljet.example.test' });
  vi.spyOn(client, 'getAppSummary').mockImplementation(async () => structuredClone(state));
  vi.spyOn(client, 'getAppSettings').mockRejectedValue(new Error('No custom canvas'));
  vi.spyOn(client, 'listTables').mockResolvedValue([]);
  vi.spyOn(client, 'renameApp').mockImplementation(async (_app, _version, name) => { writes.push('rename'); state.name = name; });
  vi.spyOn(client, 'createPages').mockImplementation(async ({ pages }) => pages.map((page, index) => {
    writes.push('create page');
    const id = `page-${state.pages.length}`;
    state.pages.push({ ...page, id, components: [] });
    return { ...page, page_id: id, index };
  }));
  return { client, state, writes, http };
}

function plan(explicit = false): AppPlanInput {
  return {
    app_id: 'studio', version_id: 'draft', app_name: 'Library desk',
    pages: [{ name: 'Catalog', icon: 'IconBooks', components: [
      { name: 'catalogPanel', ...(explicit ? { client_ref: 'panel-ref' } : {}), type: 'Container', properties: {}, layout: rect(10, 220, 39) },
      { name: 'referenceInput', ...(explicit ? { client_ref: 'inputAlias' } : {}), parent_ref: explicit ? 'panel-ref' : 'catalogPanel',
        type: 'TextInput', properties: { label: 'Reference' }, styles: { alignment: 'top' }, layout: rect(20) },
      { name: 'clearReference', ...(explicit ? { client_ref: 'clear-ref' } : {}), type: 'Button', properties: { text: 'Clear' }, layout: rect(260, 40, 10) },
      { name: 'referencePreview', type: 'Text', properties: { text: `{{components.${explicit ? 'inputAlias' : 'referenceInput'}?.value}}` }, layout: rect(320) },
    ] }],
    events: [{ source_type: 'component', source_ref: explicit ? 'clear-ref' : 'clearReference', trigger: 'onClick', action: {
      actionId: 'control-component', target_ref: explicit ? 'inputAlias' : 'referenceInput',
      componentSpecificActionHandle: 'setText', componentSpecificActionParams: [{ handle: 'text', value: '' }],
    } }],
  };
}

async function apply(client: ReturnType<typeof appHarness>['client'], spec: AppPlanInput) {
  const linted = JSON.parse(text(await lintAppSpecTool(client).handler(spec)));
  expect(linted.plan_token, JSON.stringify(linted.errors)).toEqual(expect.any(String));
  const result = await applyAppPhaseTool(client).handler({ app_id: 'studio', plan_token: linted.plan_token, check_reads: false });
  expect(result.isError, text(result)).toBeFalsy();
  return JSON.parse(text(result));
}

beforeEach(() => clearAppPlansForTests());

describe('component reference identity across preflight and writes', () => {
  it.each([false, true])('applies nesting, event targets and bindings with explicit refs = %s', async (explicit) => {
    const { client, state, writes } = appHarness();
    const result = await apply(client, plan(explicit));
    const components = state.pages[0]!.components;
    const parent = components.find(c => c.name === 'catalogPanel')!;
    const input = components.find(c => c.name === 'referenceInput')!;
    const button = components.find(c => c.name === 'clearReference')!;
    expect(input.parent).toBe(parent.id);
    expect(state.events[0]).toMatchObject({ sourceId: button.id, event: { componentId: input.id } });
    expect((components.find(c => c.name === 'referencePreview')!.properties as any).text.value)
      .toContain(explicit ? 'components["referenceInput"]' : 'components.referenceInput');
    expect(result.validation.ok, JSON.stringify(result.validation.errors)).toBe(true);
    expect(result.applied).toMatchObject({ app_metadata: 1, pages: 1, components: 4, events: 1 });
    expect(writes.filter(w => w.endsWith('/components'))).toHaveLength(1);
  });

  it('keeps the same explicit target on replace when another component name equals that ref', async () => {
    const { client, state } = appHarness();
    const spec = plan(true);
    spec.pages![0]!.components![0]!.client_ref = 'referencePreview';
    spec.pages![0]!.components![1]!.parent_ref = 'referencePreview';
    spec.pages![0]!.components![3]!.client_ref = 'preview-ref';
    await apply(client, spec);
    const parentId = state.pages[0]!.components.find(c => c.name === 'catalogPanel')!.id;
    spec.pages![0]!.replace = true;
    spec.pages![0]!.components![1]!.properties = { label: 'Shelf reference' };
    await apply(client, spec);
    expect(state.pages[0]!.components.find(c => c.name === 'referenceInput')!.parent).toBe(parentId);
  });

  it.each(['catalogPanel', 'saved-panel'])('resolves an existing same-page parent by %s before writing', async (parentRef) => {
    const { client, state } = appHarness();
    state.pages.push({ id: 'catalog-page', name: 'Catalog', icon: 'IconBooks', components: [
      { id: 'saved-panel', name: 'catalogPanel', type: 'Container', properties: {}, layouts: { desktop: rect(10, 220, 39) } },
    ] });
    const spec = plan(); spec.pages![0]!.components!.shift();
    spec.pages![0]!.components![0]!.parent_ref = parentRef;
    const linted = JSON.parse(text(await lintAppSpecTool(client).handler(spec)));
    expect(linted.warnings.join(' ')).not.toMatch(/Prefer parent_ref/);
    const result = await apply(client, spec);
    expect(result.applied.pages).toBe(0);
    expect(state.pages[0]!.components.find(c => c.name === 'referenceInput')!.parent).toBe('saved-panel');
  });

  it.each([undefined, 'saved-panel'])('preserves empty parent_ref with parent %s', async (parent) => {
    const { client, state } = appHarness();
    state.pages.push({ id: 'catalog-page', name: 'Catalog', icon: 'IconBooks', components: [
      { id: 'saved-panel', name: 'catalogPanel', type: 'Container', properties: {}, layouts: { desktop: rect(10, 220, 39) } },
    ] });
    await apply(client, { app_id: 'studio', version_id: 'draft', pages: [{ name: 'Catalog', icon: 'IconBooks', components: [
      { name: 'shelfNote', type: 'Text', properties: { text: 'Shelf guide' }, parent_ref: '', parent, layout: rect(parent ? 20 : 270) },
    ] }] });
    expect(state.pages[0]!.components.find(c => c.name === 'shelfNote')!.parent).toBe(parent);
  });

  it.each([false, true])('resolves Form submit buttons and footer parents with explicit refs = %s', async (explicit) => {
    const { client, state } = appHarness();
    await apply(client, {
      app_id: 'studio', version_id: 'draft', pages: [{ name: 'Loans', icon: 'IconBooks', components: [
        { name: 'loanForm', ...(explicit ? { client_ref: 'form-ref' } : {}), type: 'Form',
          properties: { buttonToSubmit: explicit ? 'submit-ref' : 'submitLoan' }, layout: rect(10, 220, 39) },
        { name: 'submitLoan', ...(explicit ? { client_ref: 'submit-ref' } : {}), type: 'Button',
          parent_ref: explicit ? 'form-ref' : 'loanForm', slot_name: 'footer', properties: { text: 'Submit' }, layout: rect(10, 40, 10) },
      ] }], events: [{ source_type: 'component', source_ref: explicit ? 'submit-ref' : 'submitLoan', trigger: 'onClick',
        action: { actionId: 'show-alert', message: 'Ready', alertType: 'info' } }],
    });
    const [form, button] = state.pages[0]!.components;
    expect((form!.properties as any).buttonToSubmit.value).toBe(button!.id);
    expect(button!.parent).toBe(`${form!.id}-footer`);
  });

  it('refuses an ambiguous existing parent before the app is renamed', async () => {
    const { client, state, writes } = appHarness();
    state.pages.push({ id: 'catalog-page', name: 'Catalog', icon: 'IconBooks', components: [
      { id: 'panel-a', name: 'catalogPanel', type: 'Container' },
      { id: 'panel-b', name: 'catalogPanel', type: 'Container' },
    ] });
    const spec = plan(); spec.pages![0]!.components!.shift();
    const linted = JSON.parse(text(await lintAppSpecTool(client).handler(spec)));
    expect(linted.ok).toBe(false);
    expect(linted.errors.join(' ')).toMatch(/unknown parent_ref "catalogPanel"/);
    const stored = storeAppPlan(spec, {} as AppSpecLintResult);
    const result = await applyAppPhaseTool(client).handler({ app_id: 'studio', plan_token: stored.plan_token });
    expect(result.isError).toBe(true);
    expect(writes).toEqual([]);
  });

  const invalidCases: Array<[string, (spec: AppPlanInput) => void, RegExp]> = [
    ['unknown parent', s => { s.pages![0]!.components![1]!.parent_ref = 'missingPanel'; }, /unknown parent_ref/],
    ['explicit ref hides name', s => { s.pages![0]!.components![0]!.client_ref = 'panel-ref'; }, /unknown parent_ref/],
    ['fallback collides with explicit ref', s => { s.pages![0]!.components![2]!.client_ref = 'catalogPanel'; }, /Duplicate component/],
    ['duplicate explicit refs', s => { s.pages![0]!.components![0]!.client_ref = 'shared'; s.pages![0]!.components![2]!.client_ref = 'shared'; }, /Duplicate component/],
    ['empty explicit ref', s => { s.pages![0]!.components![0]!.client_ref = ''; }, /client_ref must not be empty/],
    ['conflicting parent fields', s => { s.pages![0]!.components![1]!.parent = 'saved-parent'; }, /EITHER parent or parent_ref/],
    ['unknown event target', s => { s.events![0]!.action.target_ref = 'missingInput'; }, /unknown or unsupported target_ref/],
  ];
  it.each(invalidCases)('rejects %s in lint and apply before any mutation', async (_label, change, error) => {
    const { client, state, writes } = appHarness();
    const spec = plan(); change(spec);
    const before = structuredClone(state);
    const linted = JSON.parse(text(await lintAppSpecTool(client).handler(spec)));
    expect(linted.ok).toBe(false);
    expect(linted.errors.join(' ')).toMatch(error);
    expect(linted.plan_token).toBeUndefined();
    // Also defend the apply boundary if an older compiler or internal caller stored an inconsistent plan.
    const stored = storeAppPlan(spec, {} as AppSpecLintResult);
    const result = await applyAppPhaseTool(client).handler({ app_id: 'studio', plan_token: stored.plan_token });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(error);
    expect(writes).toEqual([]);
    expect(state).toEqual(before);
  });

  it('rejects a component ref that collides with an existing event target added since lint', async () => {
    const { client, state, writes } = appHarness();
    const spec = plan();
    const linted = JSON.parse(text(await lintAppSpecTool(client).handler(spec)));
    state.pages.push({ id: 'other-page', name: 'Notes', icon: 'IconNotes', components: [
      { id: 'saved-input', name: 'referenceInput', type: 'TextInput', properties: { label: { value: 'Notes' } } },
    ] });
    const before = structuredClone(state);
    const result = await applyAppPhaseTool(client).handler({ app_id: 'studio', plan_token: linted.plan_token });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/Duplicate component client_ref\/name "referenceInput"/);
    expect(writes).toEqual([]);
    expect(state).toEqual(before);
  });

  it('rejects an ambiguous existing event target before writes', async () => {
    const { client, state, writes } = appHarness();
    for (const id of ['north', 'south']) state.pages.push({ id, name: id, icon: 'IconBooks', components: [
      { id: `${id}-input`, name: 'sharedInput', type: 'TextInput', properties: { label: { value: 'Note' } } },
    ] });
    const spec = plan(); spec.events![0]!.action.target_ref = 'sharedInput';
    const linted = JSON.parse(text(await lintAppSpecTool(client).handler(spec)));
    expect(linted.ok).toBe(false);
    expect(linted.errors.join(' ')).toMatch(/unknown or unsupported target_ref "sharedInput"/);
    expect(linted.plan_token).toBeUndefined();
    const stored = storeAppPlan(spec, {} as AppSpecLintResult);
    const result = await applyAppPhaseTool(client).handler({ app_id: 'studio', plan_token: stored.plan_token });
    expect(result.isError).toBe(true);
    expect(writes).toEqual([]);
  });

  it('checks every direct page batch before sending the first component write', async () => {
    const { client, http } = appHarness();
    const result = await addComponentBatchesTool(client).handler({ app_id: 'studio', version_id: 'draft', pages: [
      { page_id: 'one', components: [{ name: 'heading', type: 'Text', properties: { text: 'Library' }, layout: rect(10) }] },
      { page_id: 'two', components: [{ name: 'nestedText', type: 'Text', parent_ref: 'unknown', properties: { text: 'Shelf' }, layout: rect(10) }] },
    ] });
    expect(result.isError).toBe(true);
    expect(http).not.toHaveBeenCalled();
  });
});
