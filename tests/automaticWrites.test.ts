import { describe, expect, it } from 'vitest';

// cy-venue b8: a build shipped 14 ToolJet DB updates that ran on page load or in a chain from a load, so every visit
// changed the data. The app lint names such a write.
describe('app lint: a write that runs on its own', () => {
  it('is named in a warning', async () => {
    const { lintAutomaticWrites } = await import('../src/renderReadiness.js');
    const summary = {
      pages: [], queries: [
        { id: 'r', name: 'allEnquiries', kind: 'tooljetdb', options: { operation: 'list_rows', runOnPageLoad: true } },
        { id: 'w', name: 'repairBalance01', kind: 'tooljetdb', options: { operation: 'update_rows' } },
        { id: 's', name: 'saveOne', kind: 'tooljetdb', options: { operation: 'update_rows' } },
      ],
      events: [
        { id: 'e1', target: 'data_query', sourceId: 'r', event: { eventId: 'onDataQuerySuccess', actionId: 'run-query', queryId: 'w' } },
        { id: 'e2', target: 'component', sourceId: 'b', event: { eventId: 'onClick', actionId: 'run-query', queryId: 's' } },
      ],
    };
    const warnings = lintAutomaticWrites(summary as never);
    expect(warnings.join(' ')).toMatch(/repairBalance01/);
    expect(warnings.join(' ')).not.toMatch(/saveOne/);
  });
});

