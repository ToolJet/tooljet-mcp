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

export function validatePersistedAppSummary(summary: AppSummary): PersistedAppValidation {
  const structural = validateAppStructure(summary);
  const errors = [...structural.errors];
  const warnings = [...structural.warnings];
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
