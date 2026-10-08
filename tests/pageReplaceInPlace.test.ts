import { describe, expect, it } from 'vitest';
import { diffPageInPlace } from '../src/pageReplaceInPlace.js';

// A page replace deleted and recreated every component of the page: a one-line patch rewrote 13 components, changed
// their ids and left the page half-built when a write failed midway. The plan is compared with what the page holds:
// a component the plan leaves as it is is not written, one that only moved gets a layout update, and one that
// changed is recreated under its own id, so ids stay stable across a replace.
const DEFAULTS: Record<string, Record<string, Record<string, unknown>>> = {
  Text: { properties: { visibility: { value: '{{true}}' }, textFormat: { value: 'html' } }, styles: { textSize: { value: 14 } } },
  Button: { properties: { visibility: { value: '{{true}}' }, loadingState: { value: '{{false}}' } }, styles: {} },
  Container: { properties: { visibility: { value: '{{true}}' }, showHeader: { value: '{{true}}' } }, styles: {} },
  Form: { properties: { visibility: { value: '{{true}}' } }, styles: {} },
};
let n = 0;
const newId = () => `new-${++n}`;
const rect = (top: number, height = 40) => ({ top, left: 2, width: 10, height });
const storedRect = (top: number, height = 40) => ({ desktop: { ...rect(top, height), updatedAt: 'x' }, mobile: { ...rect(top, height), updatedAt: 'x' } });

const stored = [
  { id: 'c-title', name: 'title', type: 'Text', properties: { text: { value: 'Orders' }, visibility: { value: '{{true}}' }, textFormat: { value: 'html' } }, styles: { textSize: { value: 14 } }, layouts: storedRect(20) },
  { id: 'c-box', name: 'box', type: 'Container', properties: { showHeader: { value: '{{false}}' }, visibility: { value: '{{true}}' } }, styles: {}, layouts: storedRect(80, 200) },
  { id: 'c-inner', name: 'inner', type: 'Text', properties: { text: { value: 'hello' }, visibility: { value: '{{true}}' }, textFormat: { value: 'html' } }, styles: { textSize: { value: 14 } }, layouts: storedRect(10), parent: 'c-box' },
  { id: 'c-save', name: 'save', type: 'Button', properties: { text: { value: 'Save' }, visibility: { value: '{{true}}' }, loadingState: { value: '{{false}}' } }, styles: {}, layouts: storedRect(300) },
];
const planned = () => [
  { name: 'title', type: 'Text', properties: { text: { value: 'Orders' } }, layout: rect(20) },
  { name: 'box', type: 'Container', clientRef: 'box', properties: { showHeader: { value: '{{false}}' } }, layout: rect(80, 200) },
  { name: 'inner', type: 'Text', parentRef: 'box', properties: { text: { value: 'hello' } }, layout: rect(10) },
  { name: 'save', type: 'Button', properties: { text: { value: 'Save' } }, layout: rect(300) },
];
const diff = (plan: unknown[], existing: unknown[] = stored) => diffPageInPlace(existing as never, plan as never, DEFAULTS as never, newId);

describe('a page replace compared with what the page holds', () => {
  it('writes nothing for a plan that matches the page, defaults included', () => {
    const d = diff(planned());
    expect(d.keep.sort()).toEqual(['box', 'inner', 'save', 'title']);
    expect(d.create).toEqual([]);
    expect(d.relayout).toEqual([]);
    expect(d.deleteIds).toEqual([]);
    expect(d.ids.get('box')).toBe('c-box');
  });

  it('recreates a changed component under its own id and leaves the rest', () => {
    const plan = planned();
    plan[3] = { ...plan[3]!, properties: { text: { value: 'Save changes' } } };
    const d = diff(plan);
    expect(d.keep.sort()).toEqual(['box', 'inner', 'title']);
    expect(d.deleteIds).toEqual(['c-save']);
    expect(d.create.map((c) => [c.id, c.name])).toEqual([['c-save', 'save']]);
    expect(d.recreated).toEqual(['save']);
  });

  it('moves a component that only changed place', () => {
    const plan = planned();
    plan[3] = { ...plan[3]!, layout: rect(360) };
    const d = diff(plan);
    expect(d.create).toEqual([]);
    expect(d.deleteIds).toEqual([]);
    expect(d.relayout).toEqual([{ componentId: 'c-save', desktop: rect(360), mobile: rect(360) }]);
    expect(d.keep).not.toContain('save');
  });

  it('creates a new component, under a kept parent by that parent’s id', () => {
    const plan = [...planned(), { name: 'note', type: 'Text', parentRef: 'box', properties: { text: { value: 'new' } }, layout: rect(60) }];
    const d = diff(plan);
    expect(d.create).toHaveLength(1);
    expect(d.create[0]).toMatchObject({ name: 'note', parent: 'c-box' });
    expect(d.create[0]!.parentRef).toBeUndefined();
    expect(d.create[0]!.id).toMatch(/^new-/);
    expect(d.recreated).toEqual([]);
    expect(d.deleteIds).toEqual([]);
  });

  it('deletes a component the plan no longer has', () => {
    const d = diff(planned().filter((c) => c.name !== 'save'));
    expect(d.deleteIds).toEqual(['c-save']);
    expect(d.create).toEqual([]);
  });

  it('recreates a component that holds a value the plan does not set and the widget does not default to', () => {
    const edited = stored.map((c) => (c.name === 'title' ? { ...c, properties: { ...c.properties, visibility: { value: '{{queries.q.data.length > 0}}' } } } : c));
    const d = diff(planned(), edited);
    expect(d.recreated).toEqual(['title']);
  });

  it('recreates a component whose type changed, keeping its id', () => {
    const plan = planned();
    plan[0] = { name: 'title', type: 'Button', properties: { text: { value: 'Orders' } }, layout: rect(20) };
    const d = diff(plan);
    expect(d.create.map((c) => [c.id, c.type])).toEqual([['c-title', 'Button']]);
    expect(d.deleteIds).toEqual(['c-title']);
  });

  it('recreates a child whose parent changed', () => {
    const plan = planned();
    plan[2] = { name: 'inner', type: 'Text', properties: { text: { value: 'hello' } }, layout: rect(10) } as never;
    const d = diff(plan);
    expect(d.recreated).toEqual(['inner']);
    expect(d.create[0]!.parent).toBeUndefined();
  });

  it('compares as changed a widget it has no defaults for', () => {
    const custom = [{ id: 'c-x', name: 'x', type: 'FutureWidget', properties: { a: { value: 1 } }, styles: {}, layouts: storedRect(20) }];
    const d = diff([{ name: 'x', type: 'FutureWidget', properties: { a: { value: 1 } }, layout: rect(20) }], custom);
    expect(d.recreated).toEqual(['x']);
    expect(d.why.x).toMatch(/no default definition/);
  });

  it('reads the plan the way ToolJet reads a stored component: bookkeeping of a default entry is not a difference', () => {
    const defs = { Table: { properties: { autogenerateColumns: { value: true, generateNestedColumns: true }, columns: { value: [{ name: 'id' }] } }, styles: {} } };
    const table = [{ id: 'c-t', name: 't', type: 'Table', properties: { autogenerateColumns: { value: true, generateNestedColumns: true }, columns: { value: [{ name: 'Name', key: 'name' }] } }, styles: {}, layouts: storedRect(20, 300) }];
    const plan = [{ name: 't', type: 'Table', properties: { autogenerateColumns: { value: true }, columns: { value: [{ name: 'Name', key: 'name' }] } }, layout: rect(20, 300) }];
    expect(diffPageInPlace(table as never, plan as never, defs as never, newId).keep).toEqual(['t']);
  });

  it('reads a Form’s submit button by name as the id the page holds', () => {
    const form = [
      { id: 'c-form', name: 'form', type: 'Form', properties: { buttonToSubmit: { value: 'c-go' }, visibility: { value: '{{true}}' } }, styles: {}, layouts: storedRect(20, 200) },
      { id: 'c-go', name: 'go', type: 'Button', properties: { text: { value: 'Go' }, visibility: { value: '{{true}}' }, loadingState: { value: '{{false}}' } }, styles: {}, layouts: storedRect(150), parent: 'c-form' },
    ];
    const plan = [
      { name: 'form', type: 'Form', clientRef: 'form', properties: { buttonToSubmit: { value: 'go' } }, layout: rect(20, 200) },
      { name: 'go', type: 'Button', parentRef: 'form', properties: { text: { value: 'Go' } }, layout: rect(150) },
    ];
    const d = diff(plan, form);
    expect(d.keep.sort()).toEqual(['form', 'go']);
  });

  it('a recreated Form is given its submit button’s id', () => {
    const form = [
      { id: 'c-form', name: 'form', type: 'Form', properties: { buttonToSubmit: { value: 'c-go' }, visibility: { value: '{{false}}' } }, styles: {}, layouts: storedRect(20, 200) },
      { id: 'c-go', name: 'go', type: 'Button', properties: { text: { value: 'Go' }, visibility: { value: '{{true}}' }, loadingState: { value: '{{false}}' } }, styles: {}, layouts: storedRect(150), parent: 'c-form' },
    ];
    const plan = [
      { name: 'form', type: 'Form', clientRef: 'form', properties: { buttonToSubmit: { value: 'go' } }, layout: rect(20, 200) },
      { name: 'go', type: 'Button', parentRef: 'form', properties: { text: { value: 'Go' } }, layout: rect(150) },
    ];
    const d = diff(plan, form);
    expect(d.recreated).toEqual(['form']);
    expect((d.create[0]!.properties as any).buttonToSubmit.value).toBe('c-go');
  });
});
