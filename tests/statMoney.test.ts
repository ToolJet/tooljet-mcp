import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec } from '../src/componentNormalization.js';

const stat = (label: string, value: string, extra: Record<string, unknown> = {}) =>
  normalizeComponentSpec({ type: 'ShadStat', name: 's', properties: { label: { value: label }, value: { value }, ...extra } } as never)
    .component.properties as Record<string, { value: unknown } | undefined>;

describe('a money Stat bound to a number', () => {
  it('shows its figure as currency', () => {
    expect(stat('Revenue this week', '{{queries.kpis.data[0].revenue}}').valueFormat?.value).toBe('currency');
    expect(stat('Average invoice', '{{Number(queries.k.data?.[0]?.avg || 0)}}').valueFormat?.value).toBe('currency');
  });
  it('leaves counts, formatted text, literals and explicit formats alone', () => {
    expect(stat('Jobs completed', '{{queries.k.data[0].done}}').valueFormat).toBeUndefined();
    expect(stat('Revenue', "{{'$' + queries.k.data[0].revenue.toFixed(2)}}").valueFormat).toBeUndefined();
    expect(stat('Revenue', '{{queries.k.data[0].revenue.toLocaleString()}}').valueFormat).toBeUndefined();
    expect(stat('Revenue', '$1,250.00').valueFormat).toBeUndefined();
    expect(stat('Revenue', '{{x}}', { valueFormat: { value: 'compact' } }).valueFormat?.value).toBe('compact');
  });
});
