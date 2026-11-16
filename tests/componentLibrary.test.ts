import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { componentLibraryWarnings, resolveComponentLibrary, savedComponentLibrary } from '../src/componentLibrary.js';
import { registerLibraryPacks } from '../src/libraryPack.js';
import { packFromBuiltin } from '../src/packCatalog.js';
import { lintAppSpecTool } from '../src/tools/lintAppSpec.js';
import { lintComponentSpec } from '../src/lint.js';
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

  it('reads a component pack picked in the components panel, and builds another custom library in UI 1.0', () => {
    expect(resolveComponentLibrary({ componentLibrary: 'pack:antd' }, [])).toEqual({ library: 'ui2', source: 'saved', pack: 'antd' });
    expect(resolveComponentLibrary({ componentLibrary: 'lib:1234' }, ['ShadButton'])).toEqual({ library: 'ui1', source: 'saved' });
  });

  // SkyLine in Ant Design (2026-11-01): create_app could only save the default pack, so the app had to be moved to
  // Ant by hand in the database before any Lib_antd_* widget drew.
  it('saves the pack the caller names over the default', () => {
    expect(savedComponentLibrary('ui2', 'antd')).toBe('pack:antd');
    expect(savedComponentLibrary('ui2', 'MUI')).toBe('pack:mui');
    expect(savedComponentLibrary('ui1', 'antd')).toBe('ui1');
  });

  it('saves a new UI 2.0 app with the default pack', () => {
    const saved = process.env.MCP_AGENT_PACK;
    process.env.MCP_AGENT_PACK = 'mui';
    expect(savedComponentLibrary('ui2')).toBe('pack:mui');
    expect(savedComponentLibrary('ui1')).toBe('ui1');
    // Unset, the default is Rocket 2.0; an explicit empty value builds with no pack.
    delete process.env.MCP_AGENT_PACK;
    expect(savedComponentLibrary('ui2')).toBe('pack:shadcn');
    process.env.MCP_AGENT_PACK = '';
    expect(savedComponentLibrary('ui2')).toBe('ui2');
    delete process.env.MCP_AGENT_PACK;
    if (saved !== undefined) process.env.MCP_AGENT_PACK = saved;
  });

  it('reads the snake-cased key GET /api/apps/:id returns', () => {
    expect(resolveComponentLibrary({ component_library: 'ui2' }, [])).toEqual({ library: 'ui2', source: 'saved' });
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

// 2026-11-13: in an app built with a component pack, the warning said to build with the Shad* types, which a server
// that ships packs refuses ("not available on this ToolJet ... Write the app's pack component instead").
describe('componentLibraryWarnings in an app built with a component pack', () => {
  const comps = (...names: string[]) => ({ components: Object.fromEntries(names.map((n) => [n, { props: [] }])) });
  beforeEach(() => {
    registerLibraryPacks(
      [
        packFromBuiltin({ pack: 'antd', displayName: 'Ant Design', version: '1' } as never, comps('Button', 'Modal', 'Drawer') as never),
        packFromBuiltin({ pack: 'mui', displayName: 'Material UI', version: '1' } as never, comps('Button', 'Dialog') as never),
        packFromBuiltin({ pack: 'shadcn', displayName: 'Rocket 2.0', version: '1' } as never, comps('Button', 'Dialog') as never),
      ].map((built) => built!.pack)
    );
  });
  afterEach(() => registerLibraryPacks([]));

  it("names the app's pack types and its dialog and side sheet, not Shad*", () => {
    const [warning] = componentLibraryWarnings({ library: 'ui2', source: 'saved', pack: 'antd' }, [page('Text')]);
    expect(warning).toMatch(/Lib_antd_/);
    expect(warning).toMatch(/Lib_antd_Modal for dialogs/);
    expect(warning).toMatch(/Lib_antd_Drawer for side sheets/);
    expect(warning).not.toMatch(/Shad/);
  });

  it('leaves out a side sheet the pack has none of', () => {
    const [warning] = componentLibraryWarnings({ library: 'ui2', source: 'saved', pack: 'mui' }, [page('Text')]);
    expect(warning).toMatch(/Lib_mui_Dialog for dialogs/);
    expect(warning).not.toMatch(/side sheets|Shad/);
  });

  it('names the pack a new app is created with for a plan without app_id', () => {
    const [warning] = componentLibraryWarnings({ library: 'ui2', source: 'new' }, [page('Text')]);
    expect(warning).toMatch(/Lib_shadcn_Dialog for dialogs/);
    expect(warning).not.toMatch(/ShadDialog/);
  });

  it('keeps the Shad* advice on a server that ships no packs', () => {
    registerLibraryPacks([]);
    const [warning] = componentLibraryWarnings({ library: 'ui2', source: 'inferred' }, [page('Text')]);
    expect(warning).toMatch(/ShadDialog for dialogs and side sheets/);
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

describe('component pack widgets', () => {
  it('are UI 2.0 widgets: no other-library warning in a UI 2.0 app, and they imply UI 2.0', () => {
    const pages = [{ name: 'P', components: [{ name: 't', type: 'Lib_shadcn_Text' }, { name: 'tb', type: 'Lib_shadcn_DataTable' }] }];
    expect(componentLibraryWarnings({ library: 'ui2', source: 'saved' }, pages)).toEqual([]);
    expect(componentLibraryWarnings({ library: 'ui1', source: 'saved' }, pages).length).toBe(1);
    expect(resolveComponentLibrary(undefined, ['Lib_antd_Table']).library).toBe('ui2');
  });
});

describe('a pack widget\'s library keys', () => {
  it('are not reported as unknown properties (88 such lines cut a pack app\'s lint mid-JSON)', () => {
    const spec = {
      name: 'tb',
      type: 'Lib_shadcn_DataTable',
      properties: {
        libraryId: { value: 'l' },
        correlationId: { value: 'c' },
        libraryName: { value: 'shadcn UI' },
        componentName: { value: 'DataTable' },
      },
    };
    const out = JSON.stringify(lintComponentSpec(spec as never, {} as never));
    expect(out).not.toMatch(/libraryId|correlationId|libraryName|componentName/);
  });
});
