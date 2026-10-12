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
    expect(stat('Revenue', '$1,250.00').valueFormat).toBeUndefined();
    expect(stat('Revenue', '{{x}}', { valueFormat: { value: 'compact' } }).valueFormat?.value).toBe('compact');
  });
});

describe('a money Stat that formats its own number without a currency', () => {
  const sum = "(queries.e.data || []).reduce((s, r) => s + Number(r.amount), 0)";
  it('drops a trailing toLocaleString or toFixed and shows the figure as currency (an expense KPI read "822.54")', () => {
    const a = stat("This month's spend", `{{${sum}.toLocaleString("en-US", { minimumFractionDigits: 2 })}}`, { valueFormat: { value: 'auto' } });
    expect(a.valueFormat?.value).toBe('currency');
    expect(a.value?.value).toBe(`{{${sum}}}`);
    const b = stat('Revenue this week', '{{queries.k.data[0].revenue.toFixed(2)}}');
    expect(b.valueFormat?.value).toBe('currency');
    expect(b.value?.value).toBe('{{queries.k.data[0].revenue}}');
  });
  it('leaves a binding that already formats currency, a count, and an explicit non-auto format alone', () => {
    const styled = `{{${sum}.toLocaleString("en-US", { style: "currency", currency: "USD" })}}`;
    expect(stat('Spend', styled).value?.value).toBe(styled);
    expect(stat('Entries this month', '{{rows.length.toFixed(0)}}').valueFormat).toBeUndefined();
    expect(stat('Revenue', '{{x.toFixed(2)}}', { valueFormat: { value: 'number' } }).valueFormat?.value).toBe('number');
  });
});
