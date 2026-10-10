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
