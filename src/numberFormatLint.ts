/* Numbers drawn the way no business writes them (three Luna builds, 2026-10-11): money as "Amount 7.5" or "16864.00",
   a negative amount as "$-12,034", a percentage as 0.615 or 61.53846%. Each check reads a binding the model wrote and
   names the formatting the widget already offers; none prescribes a look. Warnings: a figure may be a count. */
import { bindingSpans } from './bindingSpans.js';

interface Spec {
  name?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

const valueOf = (props: Record<string, unknown> | undefined, key: string): unknown => {
  const entry = props?.[key] as { value?: unknown } | undefined;
  return entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry;
};
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
// metaFields is a comma list ('price:{} €, serves') or an array of the same specs (['price:{} €', 'serves']).
const metaFieldNames = (value: unknown): string[] =>
  (Array.isArray(value) ? value.filter((part): part is string => typeof part === 'string') : str(value).split(','))
    .map((part) => part.split(':')[0]!.trim());

// Money whatever else the name says ("unit price", "price per item").
const STRONG_MONEY_WORD = /\b(prices?|amounts?|costs?|revenue|balance|fees?|salary|salaries|payments?|subtotal|refunds?|mrr|arr|payout|takings)\b/i;
const MONEY_WORD = /\b(sales|spend|spent|budget|income|profit|invoiced?|earnings|gross|net|bill|total)\b/i;
// "Total tasks", "item total count": a total of things, not money.
const COUNT_WORD = /\b(count|qty|quantity|items?|tasks?|hours?|days?|orders?|tickets?|people|users?|hires?|visits?|guests?|covers?|seats?|steps?|points?)\b/i;
const PERCENT_WORD = /(%|\bpercent|\bpct\b|\brate\b|\bratio\b|\bshare\b|\bmargin\b|\bconversion\b|\butili[sz]ation\b|\bcompletion\b|\boccupancy\b)/i;
const LOCALE_FORMAT = /toLocaleString|Intl\.NumberFormat|formatCurrency|numeral\(/;
const SYMBOL = '[$€£₹¥]';

const words = (value: string): string => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.-]+/g, ' ');
// "payment_method", "price_tier", "cost_center": about money, not an amount.
const MONEY_QUALIFIER = /\b(methods?|status|types?|terms|dates?|modes?|plans?|tiers?|centers?|centres?|codes?|names?|ids?|frequency|schedule|currency|categor(y|ies))\b/i;
// "revenue_label", "price_text", "total_display": the formatted string the card grid warning asks for.
const FORMATTED_NAME = /\b(labels?|text|display|formatted|fmt|str)\b/i;
const isMoneyName = (value: string): boolean => {
  const w = words(value);
  if (MONEY_QUALIFIER.test(w)) return false;
  return STRONG_MONEY_WORD.test(w) || (MONEY_WORD.test(w) && !COUNT_WORD.test(w));
};
// Each identifier in code on its own: "(queries.pos_items.data).reduce(... r.line_total)" is money through line_total.
const namesMoney = (code: string): boolean => (code.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []).some(isMoneyName);

/** Problems in one bound string (a text, a value, a card grid's data). `context` is what the figure is called. */
function bindingProblems(value: string, context: string): string[] {
  const problems: string[] = [];
  const spans = bindingSpans(value);
  if (!spans.length) return problems;
  const outside = spans.reduceRight((text, span) => text.slice(0, span.start) + ' ' + text.slice(span.end), value);
  const bodies = spans.map((span) => span.body);
  // A figure followed by "%" is a percentage, whatever its operands are called.
  const percentText = /%/.test(outside) || bodies.some((body) => /['"`]\s*%|%['"`]/.test(body));
  const money = !percentText && (isMoneyName(context) || isMoneyName(outside) || bodies.some(namesMoney));
  const formatted = bodies.some((body) => LOCALE_FORMAT.test(body));
  const signed = bodies.some((body) => /Math\.abs|<\s*0/.test(body));

  // A symbol written before the figure ("$" + total, `$${total}`, "${{total}}"): a negative reads "$-12,034".
  const symbolBefore = new RegExp(`${SYMBOL}\\s*\\{\\{`).test(value) ||
    bodies.some((body) => new RegExp(`['"\`]\\s*${SYMBOL}\\s*['"]\\s*\\+|${SYMBOL}\\$\\{`).test(body));
  if (symbolBefore && !signed) {
    problems.push('joins a currency sign in front of the number, so a negative amount reads "$-12,034" and the digits are not grouped');
  } else if (money && !formatted && bodies.some((body) => /\.toFixed\(/.test(body))) {
    problems.push('formats money with toFixed, so it shows "16864.00": no currency sign and no thousands separator');
  } else if (money && !formatted && bodies.length === 1 && outside.trim() === '' &&
    /^\s*[\w$.?[\]'"]+\s*$/.test(bodies[0]!) && isMoneyName(bodies[0]!.split(/[.?[\]'"]+/).filter(Boolean).pop() ?? '')) {
    problems.push('shows a money field as a bare number ("7.5"), with no currency sign or two decimals');
  }

  // A percentage scaled by 100 but never rounded: 61.53846153846154%.
  if (percentText && bodies.some((body) => /\*\s*100\b/.test(body)) &&
    !bodies.some((body) => /toFixed|Math\.round|toLocaleString|Intl\.NumberFormat/.test(body))) {
    problems.push('multiplies a fraction by 100 without rounding, so it can read "61.53846153846154%"');
  }
  return problems;
}

const LOCALE_HINT = 'Format it in the request\'s currency and locale with two decimals, the minus sign before the symbol: ' +
  "Number(x).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) gives -$12,034.00";

/** One component's numbers: texts and headings, a Stat's value, a card grid's money fields. */
export function lintUnformattedNumbers(spec: Spec): string[] {
  const label = `${spec.type} "${spec.name ?? '?'}"`;
  const props = spec.properties;
  const out: string[] = [];

  if (['ShadText', 'ShadHeading', 'Text', 'ShadBadge'].includes(spec.type ?? '')) {
    const text = str(valueOf(props, 'text'));
    for (const problem of bindingProblems(text, spec.name ?? '')) {
      out.push(`${label}: ${problem}. ${problem.includes('100') ? 'Round it to one decimal: (x * 100).toFixed(1) + \'%\'.' : `${LOCALE_HINT}.`}`);
    }
  }

  if (spec.type === 'ShadStat') {
    const value = valueOf(props, 'value');
    const text = typeof value === 'number' ? String(value) : str(value);
    const format = str(valueOf(props, 'valueFormat')) || 'auto';
    const named = `${str(valueOf(props, 'label'))} ${spec.name ?? ''}`;
    const bodies = bindingSpans(text).map((span) => span.body).join(' ');
    const fraction = /[^/*]\/[^/*]/.test(bodies) && !/\*\s*100+\b/.test(bodies);
    if (isMoneyName(named) && format !== 'currency' && !LOCALE_FORMAT.test(text) && !new RegExp(SYMBOL).test(text)) {
      out.push(`${label}: shows money ${/toFixed/.test(text) ? 'as toFixed text ("16864.00")' : 'as a plain number'}, with no currency sign. ` +
        'Bind the number and set valueFormat "currency" with currency set to the request\'s ISO code (USD, EUR, GBP, INR): ' +
        'the Stat groups the digits, shows two decimals and puts the minus sign before the symbol.');
    } else if (format === 'percent' && fraction) {
      out.push(`${label}: valueFormat "percent" shows the number as written (42.5 shows 42.5%), so a fraction bound here reads ` +
        '"0.6%". Multiply it by 100 and round to one decimal.');
    } else if (PERCENT_WORD.test(words(named)) && format !== 'percent' && fraction && !/%/.test(text)) {
      out.push(`${label}: shows a rate as a raw fraction ("0.615"). Bind it times 100, rounded to one decimal, and set ` +
        'valueFormat "percent".');
    } else {
      // valueFormat currency formats numeric text too ("16864.00"), so only a sign joined in front still shows.
      const problems = bindingProblems(text, named).filter((problem) => format !== 'currency' || problem.includes('sign in front'));
      for (const problem of problems) {
        out.push(`${label}: ${problem}. ${problem.includes('100') ? 'Round it to one decimal and set valueFormat "percent".' : 'Bind the number and set valueFormat "currency".'}`);
      }
    }
  }

  if (spec.type === 'ShadCardGrid') {
    const data = str(valueOf(props, 'data'));
    const fields = ['titleField', 'subtitleField', 'descriptionField', 'badgeField']
      .map((key) => str(valueOf(props, key)))
      .concat(metaFieldNames(valueOf(props, 'metaFields')))
      .filter((field) => field && isMoneyName(field) && !FORMATTED_NAME.test(words(field)));
    const raw = fields.filter((field) => !LOCALE_FORMAT.test(data) || !new RegExp(`\\b${field}\\b`).test(data));
    if (raw.length) {
      out.push(`${label}: ${raw.map((f) => `"${f}"`).join(', ')} ${raw.length > 1 ? 'are' : 'is'} money shown as the raw number ` +
        '("Amount 7.5"). Map the rows in data to a formatted string for the card, e.g. ' +
        `{{(queries.q.data || []).map(r => ({ ...r, ${raw[0]}: Number(r.${raw[0]}).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) }))}}, ` +
        'in the request\'s currency and locale.');
    }
    for (const problem of bindingProblems(data, spec.name ?? '')) out.push(`${label}: its data ${problem}. ${LOCALE_HINT}.`);
  }
  return out;
}
