import { describe, expect, it, vi } from 'vitest';
import { componentLibraryWarnings, resolveComponentLibrary } from '../src/componentLibrary.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import type { ToolJetClient } from '../src/tooljetClient.js';

const page = (...types: string[]) => ({
  name: 'Home',
  components: types.map((type, i) => ({ name: `${type.toLowerCase()}${i}`, type })),
});

describe('resolveComponentLibrary', () => {
  it('uses the saved setting over the widgets the app holds', () => {
    expect(resolveComponentLibrary({ componentLibrary: 'ui1' }, ['ShadButton'])).toEqual({ library: 'ui1', source: 'saved' });
    expect(resolveComponentLibrary({ componentLibrary: 'ui2' }, ['Button'])).toEqual({ library: 'ui2', source: 'saved' });
  });

  it('infers UI 2.0 from a Shad* widget and UI 1.0 otherwise, for apps without the setting', () => {
    expect(resolveComponentLibrary({ appMode: 'light' }, ['Text', 'ShadStat'])).toEqual({ library: 'ui2', source: 'inferred' });
    expect(resolveComponentLibrary(undefined, ['Table', 'FlexContainer', 'Shadow'])).toEqual({ library: 'ui1', source: 'inferred' });
    expect(resolveComponentLibrary({ componentLibrary: 'shadcn' }, [])).toEqual({ library: 'ui1', source: 'inferred' });
  });
});

describe('componentLibraryWarnings', () => {
  const ui1 = { library: 'ui1', source: 'saved' } as const;
  const ui2 = { library: 'ui2', source: 'inferred' } as const;

  it('warns when a plan adds UI 2.0 widgets to a UI 1.0 app', () => {
    const [warning] = componentLibraryWarnings(ui1, [page('Table', 'ShadButton', 'ShadButton', 'FlexContainer')]);
    expect(warning).toMatch(/built in ToolJet UI 1\.0 \(its saved library\)/);
    expect(warning).toMatch(/ShadButton \(shadbutton1, shadbutton2\)/);
    expect(warning).not.toMatch(/Table \(table0|FlexContainer \(/);
    expect(warning).toMatch(/component_library_request/);
  });

  it('warns about native widgets in a UI 2.0 app, except FlexContainer, the Table in its UI 2.0 look and the Map', () => {
    expect(componentLibraryWarnings(ui2, [page('FlexContainer', 'ShadCard', 'Table', 'Map')])).toEqual([]);
    const [warning] = componentLibraryWarnings(ui2, [page('ModalV2', 'TextInput', 'ShadText')]);
    expect(warning).toMatch(/ModalV2 \(modalv20\); TextInput \(textinput1\)/);
    expect(warning).toMatch(/ShadDialog/);
    const defaultLook = { name: 'Home', components: [{ name: 'grid', type: 'Table', styles: { tableLook: { value: 'default' } } }] };
    expect(componentLibraryWarnings(ui2, [defaultLook])).toHaveLength(1);
  });

  it('stays quiet when the plan quotes the user asking for the other library', () => {
    expect(componentLibraryWarnings(ui1, [page('ShadButton')], 'use the new components')).toEqual([]);
  });

  it('never names the source kit in what the model reads', () => {
    const text = [
      ...componentLibraryWarnings(ui1, [page('ShadButton')]),
      ...componentLibraryWarnings(ui2, [page('Button')]),
    ].join(' ');
    expect(text).not.toMatch(/shadcn\/ui|shadcn pack/i);
  });
});

describe('lint_app_spec component library check', () => {
  const summary = (globalTypes: string[], componentLibrary?: unknown) => ({
    app_id: 'app1', version_id: 'v1', queries: [], events: [],
    ...(componentLibrary ? { component_library: componentLibrary } : {}),
    pages: [{ id: 'p1', name: 'Home', components: globalTypes.map((type, i) => ({ id: `c${i}`, name: `c${i}`, type })) }],
  });
  const client = (appSummary: unknown) => ({
    getAppSummary: vi.fn().mockResolvedValue(appSummary),
    listTables: vi.fn().mockResolvedValue([]),
    listDatasources: vi.fn().mockResolvedValue([]),
    getAppSettings: vi.fn().mockResolvedValue({ globalSettings: {} }),
  }) as unknown as ToolJetClient;
  const plan = (extra: Record<string, unknown> = {}) => ({
    app_id: 'app1',
    pages: [{ name: 'Orders', components: [{ client_ref: 'b', name: 'saveButton', type: 'ShadButton', layout: { top: 0, left: 0, width: 10, height: 4 } }] }],
    ...extra,
  });
  const warningsOf = async (c: ToolJetClient, args: Record<string, unknown>) =>
    (JSON.parse((await lintAppSpecTool(c).handler(args as never)).content[0]!.text).warnings ?? []) as string[];

  it('warns for a UI 2.0 widget in an app saved on UI 1.0, unless the plan quotes the request', async () => {
    const c = client(summary(['Table'], { library: 'ui1', source: 'saved' }));
    expect((await warningsOf(c, plan())).some((w) => /built in ToolJet UI 1\.0/.test(w))).toBe(true);
    expect((await warningsOf(c, plan({ component_library_request: 'use UI 2.0' }))).some((w) => /ToolJet UI 1\.0/.test(w))).toBe(false);
  });

  it('infers the library from the app when the summary carries none', async () => {
    const c = client(summary(['ShadCard']));
    expect((await warningsOf(c, plan())).some((w) => /built in ToolJet UI/.test(w))).toBe(false);
  });

  it('takes a plan without app_id to be for a new UI 2.0 app', async () => {
    const c = client(undefined);
    const native = { pages: [{ name: 'Orders', components: [{ client_ref: 'b', name: 'saveButton', type: 'Button', layout: { top: 0, left: 0, width: 10, height: 4 } }] }] };
    expect((await warningsOf(c, native)).some((w) => /built in ToolJet UI 2\.0 \(new apps are/.test(w))).toBe(true);
  });
});
