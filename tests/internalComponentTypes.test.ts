import { describe, expect, it } from 'vitest';
import { getCatalog } from '../src/catalog.js';
import { lintComponents } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';
import { validatePersistedAppSummary } from '../src/appValidation.js';
import { getComponentCatalogTool } from '../src/tools/getComponentCatalog.js';

// 2026-11-13: the catalog offered ToolJet's internal LibraryComponent and ModuleContainer types (the editor's palette
// hides them: ComponentManagerTab IGNORED_ITEMS), and add_components saved them into a normal app as blank boxes. A pack
// component is written as Lib_<pack>_<Component> (stored as LibraryComponent with its identity); a module container is
// a module app's own root.
const INTERNAL = ['LibraryComponent', 'ModuleContainer', 'PackComponent'];

describe('the component palette', () => {
  it('leaves out the internal types', () => {
    const types = getCatalog().map((entry) => entry.type);
    for (const type of INTERNAL) expect(types).not.toContain(type);
  });

  it('keeps ModuleViewer, the way to embed a module', () => {
    expect(getCatalog().map((entry) => entry.type)).toContain('ModuleViewer');
  });
});

describe('get_component_catalog for an internal type', () => {
  it.each([
    ['LibraryComponent', /Lib_<pack>_<Component>/],
    ['ModuleContainer', /module/i],
  ])('refuses %s, saying what to use', async (type, pointer) => {
    const out = await getComponentCatalogTool({} as never).handler({ type } as never);
    expect(out.isError).toBe(true);
    expect(String(out.content[0]!.text)).toMatch(pointer);
  });
});

describe('authoring an internal type', () => {
  it.each(INTERNAL)('refuses %s', (type) => {
    const errors = lintComponents([{ name: 'box', type, properties: {}, layout: { top: 0, left: 0, width: 10, height: 40 } }] as never).errors;
    expect(errors.join(' ')).toMatch(new RegExp(`"box".*${type}.*internal`));
  });

  it('refuses it in a plan (lint_app_spec)', () => {
    const result = lintPlannedApp({ pages: [{ clientRef: 'home', name: 'Home', icon: 'IconHome2', components: [
      { name: 'box', type: 'ModuleContainer', properties: {}, layout: { left: 0, top: 0, width: 10, height: 40 } },
    ] }] } as never);
    expect(result.errors.join(' ')).toMatch(/"box".*ModuleContainer.*internal/);
  });

  it('still accepts a pack component', () => {
    const errors = lintComponents([{ name: 'card', type: 'Lib_shadcn_Card', properties: {}, layout: { top: 0, left: 0, width: 10, height: 40 } }] as never).errors;
    expect(errors.join(' ')).not.toMatch(/internal/);
  });
});

describe('validate_app', () => {
  const summary = (type: string) =>
    validatePersistedAppSummary({
      app_id: 'a', queries: [], events: [],
      pages: [{ id: 'home', name: 'Home', handle: 'home', components: [{ id: 'c1', name: 'box', type, properties: {} }] }],
    } as never);

  it.each(['LibraryComponent', 'PackComponent'])('reports a %s with no component, an empty box', (type) => {
    expect(summary(type).errors.join(' ')).toMatch(/"box".*empty box/);
  });

  it('does not report a pack component with its identity (summarised as its Lib_ type)', () => {
    expect(summary('Lib_shadcn_Card').errors.join(' ')).not.toMatch(/empty box/);
  });

  // A workspace's own custom library is no pack the MCP knows, so its components stay LibraryComponent in the summary.
  it('does not report a custom library component, which names its library', () => {
    const validation = validatePersistedAppSummary({
      app_id: 'a', queries: [], events: [],
      pages: [{ id: 'home', name: 'Home', handle: 'home', components: [{
        id: 'c1', name: 'box', type: 'LibraryComponent',
        properties: { correlationId: { value: 'aaaa-bbbb' }, libraryName: { value: 'Acme UI' }, componentName: { value: 'Badge' } },
      }] }],
    } as never);
    expect(validation.errors.join(' ')).not.toMatch(/empty box/);
  });
});

// Saved components and copied custom-library ones are not the bare host type a build wrote by mistake.
describe('internal types that are kept', () => {
  it('a module app\'s own ModuleContainer is not reported by validate_app', () => {
    const validation = validatePersistedAppSummary({
      app_id: 'm', queries: [], events: [],
      pages: [{ id: 'home', name: 'Home', handle: 'home', components: [{ id: 'root', name: 'ModuleContainer1', type: 'ModuleContainer', properties: {} }] }],
    } as never);
    expect(validation.errors.join(' ')).not.toMatch(/ModuleContainer1/);
  });

  it('a custom library component that names its library is still accepted', () => {
    const errors = lintComponents([{
      name: 'badge', type: 'LibraryComponent', layout: { top: 0, left: 0, width: 10, height: 40 },
      properties: { correlationId: { value: 'aaaa-bbbb' }, libraryName: { value: 'Acme UI' }, componentName: { value: 'Badge' } },
    }] as never).errors;
    expect(errors.join(' ')).not.toMatch(/internal/);
  });
});
