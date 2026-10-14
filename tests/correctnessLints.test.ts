import { describe, expect, it } from 'vitest';
import { lintUnformattedNumbers } from '../src/numberFormatLint.js';
import { lintCopiedCards } from '../src/repeatedCardsLint.js';
import { lintTallContainers } from '../src/containerExtentLint.js';
import { lintUniformSeedMetrics } from '../src/seedVarietyLint.js';
import { lintChartAccents } from '../src/chartAccentLint.js';
import { lintComponents } from '../src/lint.js';
import { lintPlannedApp } from '../src/appSpecLint.js';

const v = (value: unknown) => ({ value });

describe('numbers shown unformatted', () => {
  const text = (name: string, value: string, type = 'ShadText') => ({ type, name, properties: { text: v(value) } });

  it('flags money formatted with toFixed (Restaurant bill total, 2026-10-11)', () => {
    const w = lintUnformattedNumbers(text('bill_total',
      "{{'Bill total · ' + (queries.get_pos_items.data || []).reduce((sum,r) => sum + Number(r.line_total || 0),0).toFixed(2) + ' amount'}}", 'ShadHeading'));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/toFixed.*16864\.00.*toLocaleString/);
  });

  it('flags a currency sign joined in front of the number', () => {
    expect(lintUnformattedNumbers(text('net', "{{'$' + queries.pnl.data[0].net.toLocaleString()}}"))[0]).toMatch(/\$-12,034/);
    expect(lintUnformattedNumbers(text('net', 'Net ${{queries.pnl.data[0].net}}'))[0]).toMatch(/sign in front/);
    expect(lintUnformattedNumbers(text('net', '{{`$${queries.pnl.data[0].net}`}}'))[0]).toMatch(/sign in front/);
  });

  it('flags a bare money field and an unrounded percentage', () => {
    expect(lintUnformattedNumbers(text('price', '{{listItem.unit_price}}'))[0]).toMatch(/bare number/);
    expect(lintUnformattedNumbers(text('rate', "{{(done / total * 100) + '%'}}"))[0]).toMatch(/61\.53846153846154%/);
  });

  it('stays quiet for formatted money, counts and rounded percentages', () => {
    expect(lintUnformattedNumbers(text('total', "{{Number(x).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}}"))).toEqual([]);
    expect(lintUnformattedNumbers(text('tasks', '{{queries.t.data.length}} open tasks'))).toEqual([]);
    expect(lintUnformattedNumbers(text('avg', '{{rating.toFixed(1)}} stars'))).toEqual([]);
    expect(lintUnformattedNumbers(text('rate', "{{(done / total * 100).toFixed(1) + '%'}}"))).toEqual([]);
    expect(lintUnformattedNumbers(text('total_tasks', '{{listItem.total_tasks}}'))).toEqual([]);
  });

  it('asks a money Stat for valueFormat currency', () => {
    const stat = (props: Record<string, unknown>) => ({ type: 'ShadStat', name: 'salesStat', properties: props });
    expect(lintUnformattedNumbers(stat({ label: v('Sales this week'), value: v('{{Number(q.data[0].sum).toFixed(2)}}') }))[0])
      .toMatch(/valueFormat "currency"/);
    expect(lintUnformattedNumbers(stat({ label: v('Sales this week'), value: v('{{q.data[0].sum}}'), valueFormat: v('currency') }))).toEqual([]);
  });

  it('catches a rate Stat bound to a fraction', () => {
    const stat = (props: Record<string, unknown>) => ({ type: 'ShadStat', name: 'conv', properties: props });
    expect(lintUnformattedNumbers(stat({ label: v('Conversion rate'), value: v('{{won / leads}}') }))[0]).toMatch(/raw fraction/);
    expect(lintUnformattedNumbers(stat({ label: v('Conversion rate'), value: v('{{won / leads}}'), valueFormat: v('percent') }))[0]).toMatch(/"0\.6%"/);
    expect(lintUnformattedNumbers(stat({ label: v('Conversion rate'), value: v('{{Math.round(won / leads * 1000) / 10}}'), valueFormat: v('percent') }))).toEqual([]);
  });

  it('flags card grid money fields shown raw (Restaurant menu "Amount 7.5")', () => {
    const grid = (data: string) => ({ type: 'ShadCardGrid', name: 'menu_grid', properties: {
      titleField: v('dish_name'), metaFields: v('unit_price:Amount'), data: v(data) } });
    expect(lintUnformattedNumbers(grid('{{queries.get_menu.data || []}}'))[0]).toMatch(/"unit_price" is money.*Amount 7\.5/);
    expect(lintUnformattedNumbers(grid(
      "{{(queries.get_menu.data || []).map(r => ({ ...r, unit_price: Number(r.unit_price).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }))}}"
    ))).toEqual([]);
    const paidBy = { type: 'ShadCardGrid', name: 'receipts', properties: { titleField: v('order_code'), metaFields: v('payment_method:Paid by'), data: v('{{q.data}}') } };
    expect(lintUnformattedNumbers(paidBy)).toEqual([]);
  });

  it('reads card grid metaFields written as an array, and leaves formatted fields alone', () => {
    const grid = (metaFields: unknown) => ({ type: 'ShadCardGrid', name: 'menu_grid', properties: {
      titleField: v('dish_name'), metaFields: v(metaFields), data: v('{{queries.get_menu.data || []}}') } });
    expect(lintUnformattedNumbers(grid(['unit_price:Amount', 'serves']))[0]).toMatch(/"unit_price" is money/);
    expect(lintUnformattedNumbers(grid(['revenue_label']))).toEqual([]);
    expect(lintUnformattedNumbers(grid('price_text, serves'))).toEqual([]);
  });

  it('reaches the page lint as a warning', () => {
    const r = lintComponents([{ ...text('bill_total', "{{total.toFixed(2) + ' amount'}}"), layouts: { desktop: { top: 0, left: 2, width: 20, height: 40 } } }]);
    expect(r.warnings.some((w) => /toFixed/.test(w))).toBe(true);
  });
});

describe('hand-copied cards', () => {
  const card = (n: number, parent = 'grid') => [
    { type: 'FlexContainer', name: `equipmentCard${n}`, clientRef: `equipmentCard${n}`, parentRef: parent, properties: {} },
    { type: 'ShadHeading', name: `equipmentItem${n}`, parentRef: `equipmentCard${n}`, properties: { text: v(`{{(queries.equipment_rows.data||[])[${n - 1}]?.item_name}}`) } },
    { type: 'ShadBadge', name: `equipmentStatus${n}`, parentRef: `equipmentCard${n}`, properties: { text: v(`{{(queries.equipment_rows.data||[])[${n - 1}]?.status}}`) } },
    { type: 'ShadButton', name: `reviewEquipment${n}`, parentRef: `equipmentCard${n}`, properties: { text: v('Review') } },
  ];
  const grid = { type: 'FlexContainer', name: 'grid', clientRef: 'grid', properties: {} };

  it('flags four numbered copies that read rows by position (Employee onboarding Equipment page)', () => {
    const w = lintCopiedCards([grid, ...[1, 2, 3, 4].flatMap((n) => card(n))]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/4 FlexContainers "equipmentCard1" to "equipmentCard4".*by position.*ShadCardGrid.*ShadListView/);
  });

  it('groups copies split across rows and reports the outer card once', () => {
    const inner = (n: number) => ({ type: 'FlexContainer', name: `content${n}`, clientRef: `content${n}`, parentRef: `equipmentCard${n}`, properties: {} });
    const comps = [grid, { ...grid, name: 'grid2', clientRef: 'grid2' },
      ...[1, 2, 3].flatMap((n) => [...card(n), inner(n)]), ...[4, 5, 6].flatMap((n) => [...card(n, 'grid2'), inner(n)])];
    const w = lintCopiedCards(comps);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/^6 FlexContainers/);
  });

  it('leaves a row of four different KPI cards alone', () => {
    const kpi = (n: number, query: string) => [
      { type: 'FlexContainer', name: `kpiCard${n}`, clientRef: `kpiCard${n}`, parentRef: 'grid', properties: {} },
      { type: 'ShadText', name: `kpiLabel${n}`, parentRef: `kpiCard${n}`, properties: { text: v(query) } },
    ];
    expect(lintCopiedCards([grid, ...kpi(1, 'Open'), ...kpi(2, 'Late'), ...kpi(3, 'Done'), ...kpi(4, 'New')])).toEqual([]);
  });

  it('leaves three copies alone', () => {
    expect(lintCopiedCards([grid, ...[1, 2, 3].flatMap((n) => card(n))])).toEqual([]);
  });
});

describe('containers taller than their content', () => {
  const box = (name: string, height: number, props: Record<string, unknown> = {}, parentRef?: string) => ({
    type: 'FlexContainer', name, clientRef: name, parentRef, layouts: { desktop: { top: 0, left: 0, width: 43, height } },
    properties: { dynamicHeight: v(true), ...Object.fromEntries(Object.entries(props).map(([k, x]) => [k, v(x)])) },
  });
  const leaf = (name: string, height: number, parentRef: string, type = 'ShadText') => ({
    type, name, clientRef: name, parentRef, layouts: { desktop: { top: 0, left: 0, width: 43, height } }, properties: {},
  });

  it('flags the Restaurant POS row and its root (1500px row around two ~900px cards)', () => {
    const comps = [
      box('pos_root', 1600, { direction: 'column', gap: 10, padding: 12 }),
      leaf('service_heading', 50, 'pos_root', 'ShadHeading'),
      box('service_body', 1500, { direction: 'row', gap: 12, padding: 0 }, 'pos_root'),
      box('menu_panel', 916, { cardStyle: 'shadcnCard', padding: 10 }, 'service_body'),
      leaf('menu_grid', 820, 'menu_panel', 'ShadCardGrid'),
      box('ticket_panel', 900, { cardStyle: 'shadcnCard', padding: 10 }, 'service_body'),
      leaf('ticket_selector', 64, 'ticket_panel'),
      leaf('cart_table', 240, 'ticket_panel', 'Table'),
    ];
    const w = lintTallContainers(comps);
    expect(w.find((m) => m.includes('"service_body"'))).toMatch(/1500px tall, but its children need about 840px.*minimum even with dynamic height on.*about 840px/);
    expect(w.find((m) => m.includes('"pos_root"'))).toMatch(/1600px tall/);
    // Cards fit their content in the viewer: never flagged.
    expect(w.some((m) => m.includes('menu_panel'))).toBe(false);
  });

  it('reads a wrapping row that fits on one line as one line', () => {
    const comps = [
      box('service_body', 1500, { direction: 'row', flexWrap: true, padding: 0 }),
      { ...leaf('menu', 900, 'service_body'), layouts: { desktop: { top: 0, left: 0, width: 25, height: 900 } } },
      { ...leaf('ticket', 880, 'service_body'), layouts: { desktop: { top: 0, left: 0, width: 18, height: 880 } } },
    ];
    expect(lintTallContainers(comps)[0]).toMatch(/"service_body": 1500px tall, but its children need about 900px/);
    // Two lines depend on the viewer's width: no estimate.
    comps[2] = { ...comps[2]!, layouts: { desktop: { top: 0, left: 0, width: 30, height: 880 } } };
    expect(lintTallContainers(comps)).toEqual([]);
  });

  it('asks for dynamic height when it is off', () => {
    const comps = [box('section', 900, { dynamicHeight: false }), leaf('t', 200, 'section')];
    expect(lintTallContainers(comps)[0]).toMatch(/dynamicHeight to \{\{true\}\}/);
  });

  it('stays quiet for a container that fits and for a card', () => {
    expect(lintTallContainers([box('fit', 260), leaf('t', 200, 'fit')])).toEqual([]);
    expect(lintTallContainers([box('card', 900, { cardStyle: 'shadcnCard' }), leaf('t', 200, 'card')])).toEqual([]);
  });
});

describe('uniform seed metrics', () => {
  const stages = ['Offer accepted', 'Pre-boarding', 'First week', 'First month', 'Completed'];
  const progress = { 'Offer accepted': 8, 'Pre-boarding': 32, 'First week': 61, 'First month': 83, Completed: 100 } as Record<string, number>;

  it('flags progress fixed per stage (every first-week starter showed 61%)', () => {
    const rows = stages.flatMap((stage) => [1, 2, 3].map((i) => ({ hire_id: i, full_name: `H${i}`, stage, progress: progress[stage] })));
    const w = lintUniformSeedMetrics('hires', rows.map((r, i) => ({ ...r, hire_id: i + 1, full_name: `Hire ${i}` })));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/"progress" is one value per stage \(Offer accepted 8, Pre-boarding 32, First week 61\)/);
  });

  it('flags a metric that is the same in every row', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, amount: 120, status: i % 2 ? 'Paid' : 'Due' }));
    expect(lintUniformSeedMetrics('invoices', rows)[0]).toMatch(/"amount" is 120 in all 8 rows/);
  });

  it('stays quiet for varied metrics, ids, policy lookups and small tables', () => {
    const rows = stages.flatMap((stage, s) => [1, 2].map((i) => ({ id: s * 2 + i, stage, progress: progress[stage]! + i, sla_hours: s * 4 })));
    expect(lintUniformSeedMetrics('hires', rows)).toEqual([]);
    expect(lintUniformSeedMetrics('t', Array.from({ length: 4 }, () => ({ amount: 5 })))).toEqual([]);
  });

  it('reaches lint_app_spec, combining a table\'s batches', () => {
    const half = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, score: 70 }));
    const r = lintPlannedApp({ seedData: [{ tableName: 'reviews', rows: half }, { tableName: 'reviews', rows: half.map((row) => ({ ...row, id: row.id + 4 })) }] } as never);
    expect(r.warnings.some((w) => /"score" is 70 in all 8 rows/.test(w))).toBe(true);
  });
});

describe('charts in different accents on one page', () => {
  const chart = (name: string, chartColor?: string, type = 'ShadBarChart') => ({
    type, name, properties: {}, styles: chartColor === undefined ? {} : { chartColor: v(chartColor) },
  });

  it('flags a blue chart among teal ones (AC repair dashboard, cbee8d6f)', () => {
    const w = lintChartAccents([chart('tech_week_chart', '#0F766E'), chart('revenue_chart', '#0F766E', 'ShadAreaChart'), chart('jobs_type_chart', '#2563EB')]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/2 different accents \("tech_week_chart", "revenue_chart" use #0f766e; "jobs_type_chart" use #2563eb\)/);
  });

  it('counts an unset chartColor as the theme primary', () => {
    expect(lintChartAccents([chart('a'), chart('b', '#2563EB', 'ShadLineChart')])[0]).toMatch(/"a" follow the theme primary; "b" use #2563eb/);
  });

  it('stays quiet for one accent, all unset, the theme token or a single chart', () => {
    expect(lintChartAccents([chart('a', '#0F766E'), chart('b', '#0f766eff', 'ShadPieChart')])).toEqual([]);
    expect(lintChartAccents([chart('a'), chart('b', 'var(--cc-primary-brand)'), chart('s', undefined, 'ShadSparkline')])).toEqual([]);
    expect(lintChartAccents([chart('a', '#2563EB'), { type: 'ShadButton', name: 'x', styles: { chartColor: v('#000000') } }])).toEqual([]);
  });

  it('reaches the page lint', () => {
    const r = lintComponents([chart('a', '#0F766E'), chart('b', '#2563EB')].map((c, i) => ({ ...c, layouts: { desktop: { top: i * 320, left: 2, width: 39, height: 300 } } })));
    expect(r.warnings.some((w) => /different accents/.test(w))).toBe(true);
  });
});
