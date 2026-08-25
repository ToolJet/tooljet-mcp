import type { AppSummary } from './tooljetClient.js';
import { persistedEventSpecs, validateEvents } from './eventValidation.js';
import { validateAppStructure } from './lint.js';
import { issueMessages, validateQueryOptions } from './queryValidation.js';

export interface PersistedAppValidation {
  ok: boolean;
  scope: 'structural_and_contract';
  checked: string[];
  not_checked: string[];
  errors: string[];
  warnings: string[];
}

/* Scratch artifacts an agent leaves behind.

   Agents create throwaway queries and components to test a hypothesis mid-build, then move on
   without removing them. Observed shipping to users: a `debug_warranty` query duplicating the real
   one, a `diag_hire_range` probe, and a Text component literally named `hiddenRepairMarker` sitting
   on a dashboard.

   Matched on a naming convention rather than on similarity, deliberately: a name is what the agent
   itself chose to signal "this is temporary", and guessing from content would flag real work. The
   pattern is anchored to the start of the name (or a camelCase boundary) so a legitimate
   "debugging_guide" page or a "prototypes" table is not caught. */
const SCRATCH_NAME = /^(debug|diag|diagnostic|probe|tmp|temp|scratch|dummy|sample_test|testonly)[_-]|^hidden[A-Z]|[_-](probe|scratch)$/i;

function scratchArtifactWarnings(summary: AppSummary): string[] {
  const warnings: string[] = [];
  for (const query of summary.queries ?? []) {
    const name = typeof query.name === 'string' ? query.name : '';
    if (name && SCRATCH_NAME.test(name)) {
      warnings.push(
        `Query "${name}" looks like a leftover diagnostic, not part of the app. Delete it before ` +
          `finishing, or rename it if it is genuinely part of what the user asked for.`
      );
    }
  }
  for (const page of summary.pages ?? []) {
    for (const component of page.components ?? []) {
      const name = typeof component.name === 'string' ? component.name : '';
      if (name && SCRATCH_NAME.test(name)) {
        warnings.push(
          `Component "${name}" on page "${page.name}" looks like a leftover scratch component. ` +
            `Delete it before finishing, or rename it if it is genuinely part of the app.`
        );
      }
    }
  }
  return warnings;
}

export function validatePersistedAppSummary(summary: AppSummary): PersistedAppValidation {
  const structural = validateAppStructure(summary);
  const errors = [...structural.errors];
  const warnings = [...structural.warnings];
  warnings.push(...scratchArtifactWarnings(summary));
  const eventValidation = validateEvents(summary, persistedEventSpecs(summary), { includePersistedChains: false });
  errors.push(...eventValidation.errors);
  warnings.push(...eventValidation.warnings);
  for (const query of summary.queries) {
    const label = `Query "${query.name ?? query.id}"`;
    if (!query.kind || !query.options || typeof query.options !== 'object' || Array.isArray(query.options)) {
      warnings.push(`${label}: kind/options are unavailable, so its datasource contract was not validated.`);
      continue;
    }
    const validation = validateQueryOptions(query.kind, query.options as Record<string, unknown>);
    errors.push(...issueMessages(validation.errors, label));
    warnings.push(...issueMessages(validation.warnings, label));
  }
  return {
    ok: errors.length === 0,
    scope: 'structural_and_contract',
    checked: [
      'persisted references and bindings',
      'component render traps',
      'event source/trigger compatibility',
      'saved datasource option contracts',
      'leftover diagnostic queries and scratch components',
    ],
    not_checked: [
      'query execution or external API success',
      'mutating/billable query behavior',
      'browser event delivery',
      'visual rendering',
    ],
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}
