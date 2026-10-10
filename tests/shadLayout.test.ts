import { expect, it } from 'vitest';
import { lintComponentSlots, lintEmptyTabs, lintRenderedText } from '../src/lint.js';

const shadTabs = (titles: string[]) => ({
  id: 'tabs',
  type: 'ShadTabs',
  properties: { tabItems: titles.map((title, i) => ({ id: `t${i}`, title })) },
});

it('accepts tab slots on the shadcn Tabs and requires its tabs to have content', () => {
  const tabs = shadTabs(['Profile', 'Billing']);
  const child = { id: 'name', type: 'Text', parent: 'tabs-t0', layout: { left: 0, top: 0, width: 20, height: 40 } };
  expect(lintComponentSlots([tabs, child])).toEqual([]);
  expect(lintEmptyTabs([tabs, child])).toEqual([]);
  expect(lintEmptyTabs([tabs])[0]).toMatch(/no child components/);
});

it('flags shadcn Tabs left with the catalog default titles', () => {
  const message = lintRenderedText(shadTabs(['Overview', 'Activity', 'Settings'])).join(' ');
  expect(message).toMatch(/tabItems/);
  expect(message).toMatch(/ShadTabs .*default "Overview \/ Activity \/ Settings"/);
  expect(message).not.toMatch(/Tab 1/);
  expect(lintRenderedText(shadTabs(['Overview', 'Invoices', 'Settings']))).toEqual([]);
});

it('refuses a binding nested inside another', async () => {
  const { lintComponentSpec, hasNestedBinding } = await import('../src/lint.js');
  expect(hasNestedBinding("{{[{ textColor: \"{{rowData.a < 0 ? 'red' : ''}}\" }]}}")).toBe(true);
  expect(hasNestedBinding('{{a}} and {{b}}')).toBe(false);
  expect(hasNestedBinding('plain')).toBe(false);
  const result = lintComponentSpec({ name: 't', type: 'ShadTable', properties: { columns: { value: "{{[{ key: 'a', textColor: '{{rowData.a}}' }]}}" } } });
  expect(result.errors.join(' ')).toMatch(/conditionalStyles/);
});

it('treats the shadcn Dialog as a ModalV2: header and footer slots, and a show-modal target', async () => {
  const dialog = { id: 'dlg', type: 'ShadDialog', properties: { useDefaultButton: { value: '{{false}}' } } };
  const title = { id: 'ttl', type: 'ShadHeading', parent: 'dlg-header', layout: { left: 1, top: 12, width: 20, height: 32 } };
  const save = { id: 'save', type: 'ShadButton', parent: 'dlg-footer', layout: { left: 34, top: 16, width: 8, height: 36 } };
  expect(lintComponentSlots([dialog, title, save])).toEqual([]);
  const { isModalV2Type } = await import('../src/modalTypes.js');
  expect(isModalV2Type('ShadDialog')).toBe(true);
  expect(isModalV2Type('ShadCard')).toBe(false);
});

it('refuses a binding that never closes', async () => {
  // A Luna build wrote "{{[{ label: ..., type: 'number' }]}" (one brace short): ToolJet showed the expression as
  // text and three KPI tiles read "No details".
  const { lintComponentSpec, hasUnclosedBinding } = await import('../src/lint.js');
  expect(hasUnclosedBinding('{{[{ a: 1 }]}')).toBe(true);
  expect(hasUnclosedBinding('Total {{a}} of {{b')).toBe(true);
  expect(hasUnclosedBinding('{{[{ a: 1 } ]}}')).toBe(false);
  expect(hasUnclosedBinding('plain {text}')).toBe(false);
  const result = lintComponentSpec({ name: 'k', type: 'ShadKeyValue', properties: { data: { value: '{{[{ label: "A", value: 1 }]}' } } });
  expect(result.errors.join(' ')).toMatch(/properties\.data .*never closes/);
});

it('refuses a fixed-height shadcn Table too short for a page of rows', async () => {
  // A Luna build set dynamicHeight false and drew a 10-row table at ~420px: it showed five and a half rows.
  const { lintComponentSpec } = await import('../src/lint.js');
  const table = (height: number, extra: Record<string, unknown> = {}) => ({
    name: 'products', type: 'ShadTable', layout: { top: 0, left: 1, width: 40, height },
    properties: { dynamicHeight: { value: '{{false}}' }, rowsPerPage: { value: '{{10}}' }, ...extra },
  });
  expect(lintComponentSpec(table(420)).errors.join(' ')).toMatch(/needs at least 589px/);
  expect(lintComponentSpec(table(600)).errors.join(' ')).not.toMatch(/needs at least/);
  // dynamicHeight on (the default) fits its rows, so any drawn height is fine.
  expect(lintComponentSpec({ ...table(300), properties: { rowsPerPage: { value: 10 } } }).errors.join(' ')).not.toMatch(/needs at least/);
  // condensed rows and no toolbar need less.
  const lean = table(420, { cellSize: { value: 'condensed' }, displaySearchBox: { value: '{{false}}' }, showFilterButton: { value: '{{false}}' }, hideColumnSelectorButton: { value: '{{true}}' } });
  expect(lintComponentSpec(lean).errors.join(' ')).toMatch(/needs at least 453px/);
});
