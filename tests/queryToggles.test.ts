import { describe, expect, it } from 'vitest';
import { normalizeQueryOptions, validateQueryOptions } from '../src/queryValidation.js';

// An operations build (2026-09-28): every write query was saved with runOnPageLoad "{{false}}". ToolJet runs a query
// on page load when the option is truthy (dataQuerySlice runOnLoadQueries) and never evaluates it, so all fourteen writes
// ran each time the app opened: five failure toasts and a "Cancel work order undefined?" confirmation on the first page.
// The MCP's own checks read "{{false}}" as false, so nothing flagged it. The query panel's toggles are real booleans.
const write = (extra: Record<string, unknown>) => ({ operation: 'create_row', table_id: 't', create_row: { 0: { column: 'name', value: '{{components.name.value}}' } }, ...extra });

describe('query toggles are stored as booleans', () => {
  it('a static true/false string or binding becomes a boolean', () => {
    const out = normalizeQueryOptions('tooljetdb', write({ runOnPageLoad: '{{false}}', runOnDependencyChange: 'false', requestConfirmation: '{{true}}', showSuccessNotification: 'true' }));
    expect(out).toMatchObject({ runOnPageLoad: false, runOnDependencyChange: false, requestConfirmation: true, showSuccessNotification: true });
  });
  it('for every kind, not only ToolJet DB', () => {
    expect(normalizeQueryOptions('runjs', { code: 'return 1', runOnPageLoad: '{{false}}' }).runOnPageLoad).toBe(false);
    expect(normalizeQueryOptions('restapi', { method: 'get', url: 'https://x.test', runOnPageLoad: ' {{ false }} ' }).runOnPageLoad).toBe(false);
  });
  it('booleans are left as they are', () => {
    const options = write({ runOnPageLoad: false });
    expect(normalizeQueryOptions('tooljetdb', options).runOnPageLoad).toBe(false);
  });
  it('an expression ToolJet would not evaluate is refused', () => {
    const errors = validateQueryOptions('tooljetdb', write({ runOnPageLoad: '{{variables.ready}}' })).errors;
    expect(errors.map((e) => `${e.path} ${e.message}`).join(' ')).toMatch(/runOnPageLoad[\s\S]*true or false/);
  });
});
