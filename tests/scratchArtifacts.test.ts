import { describe, it, expect } from 'vitest';
import { validatePersistedAppSummary } from '../src/appValidation.js';

/* Observed shipping to real users: a `debug_warranty` query duplicating the real one (Claude), a
   `diag_hire_range` probe (OpenAI), and a Text component named `hiddenRepairMarker` sitting on a
   dashboard. Agents create these to test a hypothesis and never clean up. */
const summary = (over: Record<string, unknown> = {}) =>
  ({ id: 'app', name: 'App', pages: [], queries: [], events: [], ...over }) as never;

const warningsFor = (over: Record<string, unknown>) => validatePersistedAppSummary(summary(over)).warnings;

describe('leftover scratch artifacts', () => {
  it('flags a diagnostic query left in the app', () => {
    const w = warningsFor({ queries: [{ id: 'q1', name: 'debug_warranty', kind: 'postgresql', options: {} }] });
    expect(w.some((m) => m.includes('debug_warranty') && m.includes('leftover diagnostic'))).toBe(true);
  });

  it('flags the probe names seen from other models too', () => {
    for (const name of ['diag_hire_range', 'probe_counts', 'tmp_join_check', 'scratch_query']) {
      const w = warningsFor({ queries: [{ id: 'q', name, kind: 'postgresql', options: {} }] });
      expect(w.some((m) => m.includes(name))).toBe(true);
    }
  });

  it('flags a scratch component left on a page', () => {
    const w = warningsFor({
      pages: [{ id: 'p', name: 'Overview', components: [{ id: 'c', name: 'hiddenRepairMarker', type: 'Text' }] }],
    });
    expect(w.some((m) => m.includes('hiddenRepairMarker') && m.includes('Overview'))).toBe(true);
  });

  /* The rule keys on a naming convention the agent itself chose, so it must not punish real work
     that merely contains one of those words. */
  it('leaves legitimate names alone', () => {
    for (const name of ['debugging_guide', 'prototypes', 'temperature_by_site', 'attemptCount', 'diagnosis_list']) {
      const w = warningsFor({ queries: [{ id: 'q', name, kind: 'postgresql', options: {} }] });
      expect(w.some((m) => m.includes('leftover'))).toBe(false);
    }
  });

  /* Detection is a WARNING in the MCP so a standalone coding agent is informed rather than blocked;
     the in-product agent escalates it to blocking separately. Keeping the split here is what stops
     an in-app policy from leaking into the shared tool surface. */
  it('reports the artifact as a warning and never as an error', () => {
    const result = validatePersistedAppSummary(
      summary({ queries: [{ id: 'q1', name: 'debug_warranty', kind: 'postgresql', options: { mode: 'sql', query: 'SELECT 1' } }] })
    );
    expect(result.warnings.some((m) => m.includes('leftover diagnostic'))).toBe(true);
    expect(result.errors.some((m) => m.includes('leftover diagnostic'))).toBe(false);
    expect(result.checked).toContain('leftover diagnostic queries and scratch components');
  });
});
