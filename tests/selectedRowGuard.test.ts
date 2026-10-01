import { expect, it } from 'vitest';
import { lintSelectedRowObjectGuards } from '../src/selectedRowGuard.js';
import type { AppSummary } from '../src/tooljetClient.js';
function check(value: string, type = 'Button') {
  const key = type === 'Button' ? 'disabledState' : type === 'Text' ? 'text' : 'rawHtml';
  return lintSelectedRowObjectGuards({ pages: [{ components: [{ name: 'queue', type: 'Table' }, { name: 'decision', type, properties: { [key]: { value } } }] }] } as unknown as AppSummary);
}
it('detects object truthiness guards in actions and selection panels', () => {
  expect(check('{{!components.queue?.selectedRow || queries.save.isLoading}}')).toHaveLength(1);
  expect(check('{{components["queue"]?.selectedRow ? components.queue.selectedRow.name : "Choose"}}', 'Html')).toHaveLength(1);
  expect(check('{{components.queue.selectedRow && components.queue.selectedRow.name}}', 'Text')).toHaveLength(1);
});
it('preserves key guards, intentional row fallbacks, unrelated objects and quoted text', () => {
  expect(check('{{components.queue?.selectedRow?.id == null}}')).toEqual([]);
  expect(check('{{(components.queue.selectedRow ?? {}).name ?? "Choose"}}', 'Text')).toEqual([]);
  expect(check('{{components.other.selectedRow ? "yes" : "no"}}', 'Text')).toEqual([]);
  expect(check('{{"!components.queue.selectedRow"}}')).toEqual([]);
});
it('does not interpret function-local or shadowed component objects', () => {
  expect(check('{{((components) => !components.queue.selectedRow)({queue:{}})}}')).toEqual([]);
});
