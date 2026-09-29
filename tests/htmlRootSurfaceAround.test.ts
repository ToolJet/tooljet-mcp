import { describe, expect, it } from 'vitest';
import { lintComponents, validateAppStructure } from '../src/lint.js';
import { literalCanvasColor } from '../src/appSettings.js';

// An Html root must be painted with the surface it sits on, or its edges show the widget's white. That surface is not
// always a theme token: a near-black flight-board container's rows, or an app whose canvas is a literal colour, were
// refused for painting exactly what was around them (2026-09-28).
const html = (name: string, background: string, extra: Record<string, unknown> = {}) => ({
  name, type: 'Html', clientRef: name,
  properties: { rawHtml: { value: `<div style="height:100%;box-sizing:border-box;margin:0;background:${background}">x</div>` }, dynamicHeight: { value: '{{true}}' } },
  layouts: { desktop: { top: 0, left: 1, width: 20, height: 60 } },
  ...extra,
});
const container = (name: string, backgroundColor?: string, extra: Record<string, unknown> = {}) => ({
  name, type: 'Container', clientRef: name, properties: {},
  styles: backgroundColor ? { backgroundColor: { value: backgroundColor } } : {},
  layouts: { desktop: { top: 0, left: 1, width: 40, height: 300 } },
  ...extra,
});
const rootErrors = (errors: string[]) => [...new Set(errors.filter((e) => /the root element/.test(e)))];

describe('an Html root may paint the literal surface it sits on', () => {
  it("a container's own literal colour", () => {
    const r = lintComponents([container('board', '#111111'), html('row', '#111111', { parentRef: 'board' })] as never);
    expect(rootErrors(r.errors)).toEqual([]);
  });
  it('through a transparent container', () => {
    const r = lintComponents([container('outer', '#111111'), container('inner', 'transparent', { parentRef: 'outer' }),
      html('row', '#111111', { parentRef: 'inner' })] as never);
    expect(rootErrors(r.errors)).toEqual([]);
  });
  it("the app's literal canvas colour at the top level", () => {
    expect(rootErrors(lintComponents([html('band', '#F7F3EE')] as never, { canvasColor: '#F7F3EE' }).errors)).toEqual([]);
  });
  it('still refuses a colour that is not what surrounds it', () => {
    expect(rootErrors(lintComponents([container('board', '#111111'), html('row', '#FFFFFF', { parentRef: 'board' })] as never).errors)).toHaveLength(1);
    expect(rootErrors(lintComponents([html('band', '#F7F3EE')] as never).errors)).toHaveLength(1);
    expect(rootErrors(lintComponents([html('band', '#EEEEEE')] as never, { canvasColor: '#F7F3EE' }).errors)).toHaveLength(1);
  });
  it('persisted components resolve their parent by id, including a header slot', () => {
    const summary = {
      app_id: 'a', pages: [{ id: 'p', name: 'P', handle: 'p', components: [
        { id: '0f8a1c2e-1111-2222-3333-444455556666', name: 'board', type: 'Container', properties: {}, styles: { headerBackgroundColor: { value: '#222222' }, backgroundColor: { value: '#111111' } } },
        { ...html('row', '#111111'), id: 'r1', parent: '0f8a1c2e-1111-2222-3333-444455556666' },
        { ...html('head', '#222222'), id: 'h1', parent: '0f8a1c2e-1111-2222-3333-444455556666-header' },
      ] }], queries: [], events: [],
    };
    expect(rootErrors(validateAppStructure(summary as never).errors)).toEqual([]);
  });
});

describe('the literal canvas colour', () => {
  const client = (colour: unknown) => ({ getAppSettings: async () => ({ global_settings: { canvasBackgroundColor: colour } }) }) as never;
  it('is read only when it is a plain colour', async () => {
    expect(await literalCanvasColor(client('#F7F3EE'), 'a', 'v')).toBe('#F7F3EE');
    expect(await literalCanvasColor(client('var(--cc-appBackground-surface)'), 'a', 'v')).toBeUndefined();
    expect(await literalCanvasColor({} as never, 'a', 'v')).toBeUndefined();
    expect(await literalCanvasColor(client('#F7F3EE'), 'a')).toBeUndefined();
  });
});
