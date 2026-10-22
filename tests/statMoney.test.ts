import { describe, expect, it } from 'vitest';
import { normalizeComponentSpec, plannedCurrency } from '../src/componentNormalization.js';

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

describe('a total of things counted', () => {
  it('is a count, in English, Portuguese and Spanish (a client total read "$26")', () => {
    expect(stat('Total de Clientes', '{{queries.k.data.clientes}}').valueFormat).toBeUndefined();
    expect(stat('Total customers', '{{queries.k.data.n}}').valueFormat).toBeUndefined();
    expect(stat('Total de pacientes', '{{queries.k.data.n}}').valueFormat).toBeUndefined();
    expect(stat('Inventory value', '{{queries.k.data.v}}').valueFormat?.value).toBe('currency');
  });
  it('stays money when another money word names it', () => {
    expect(stat('Total revenue from customers', '{{queries.k.data.r}}').valueFormat?.value).toBe('currency');
    expect(stat('Total spend per vendor', '{{queries.k.data.r}}').valueFormat?.value).toBe('currency');
  });
});

describe('an inferred money Stat in a plan that names a currency', () => {
  it('takes that currency instead of the USD default', () => {
    const plan = [
      { type: 'ShadStat', name: 'a', properties: { label: { value: 'Faturamento' }, value: { value: '{{x}}' }, valueFormat: { value: 'currency' }, currency: { value: 'BRL' } } },
      { type: 'ShadStat', name: 'b', properties: { label: { value: 'Revenue this month' }, value: { value: '{{y}}' } } },
    ];
    const currency = plannedCurrency(plan);
    expect(currency).toBe('BRL');
    const b = normalizeComponentSpec({ ...plan[1] } as never, { currency }).component.properties as Record<string, { value: unknown }>;
    expect(b.currency?.value).toBe('BRL');
    const revenue = normalizeComponentSpec({ type: 'ShadStat', name: 'c', properties: { label: { value: 'Revenue' }, value: { value: '{{y}}' }, currency: { value: 'EUR' } } } as never, { currency }).component.properties as Record<string, { value: unknown }>;
    expect(revenue.currency?.value).toBe('EUR');
  });
});
