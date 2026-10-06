import { expect, it } from 'vitest';
import { lintComponentSpec } from '../src/lint.js';

const table = (height: number, columns?: unknown[]) => ({ type: 'Table', name: 'records',
  properties: { enablePagination: {value:true}, rowsPerPage: {value:4}, dynamicHeight: {value:false},
    displaySearchBox: {value:false}, showFilterButton: {value:false}, showDownloadButton: {value:false},
    showAddNewRowButton: {value:false}, showBulkUpdateActions: {value:false},
    ...(columns ? { columns: { value: columns } } : {}) },
  styles: { contentWrap: {value:false}, cellSize: {value:'regular'} },
  layouts: { desktop: { top:0, left:0, width:39, height } },
});

it('uses the measured 49px chip-row minimum when a visible column renders chips', () => {
  const chips = [{ name: 'Status', key: 'status', columnType: 'tagsV2' }];
  expect(lintComponentSpec(table(262, chips)).warnings.join(' ')).toContain('too short to show');
  expect(lintComponentSpec(table(278, chips)).warnings.join(' ')).not.toContain('too short to show');
});

it('ignores hidden chip columns and plain text columns', () => {
  const hidden = [{ name: 'Status', key: 'status', columnType: 'tagsV2', columnVisibility: false }];
  const text = [{ name: 'Status', key: 'status', columnType: 'string' }];
  expect(lintComponentSpec(table(262, hidden)).warnings.join(' ')).not.toContain('too short to show');
  expect(lintComponentSpec(table(262, text)).warnings.join(' ')).not.toContain('too short to show');
});
