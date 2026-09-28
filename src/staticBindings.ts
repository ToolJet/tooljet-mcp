import moment from 'moment';
import { parseExpression } from '@babel/parser';

/**
 * ToolJet runs a saved query with the values of its {{ }} bindings supplied by the caller
 * (`resolvedOptions`); a binding it is not given resolves to undefined. The editor resolves them in
 * the browser. A browser-free run can still resolve the ones that read no live app state: dates from
 * moment(), arithmetic, string formatting.
 *
 * Bindings are model-authored text, so they are INTERPRETED, never executed: the expression is parsed
 * and walked here, and only the operations named below are carried out. No property is ever looked up
 * by a name taken from the expression unless that name is on a fixed list, and every argument handed to
 * a library call is a primitive (or a moment this interpreter made) checked for that call. node:vm was
 * tried first and is not a security boundary: host-realm objects returned from inside it (a moment
 * locale's longDateFormat('constructor')) led back to the host Function.
 */

type MomentBox = { kind: 'moment'; m: moment.Moment };
type Value = string | number | boolean | null | undefined | MomentBox;
class Unsupported extends Error {}

const MAX_EXPRESSION_CHARS = 600;
const MAX_PAD = 1000;
const MATH_FNS: Record<string, (...args: number[]) => number> = {
  floor: Math.floor, ceil: Math.ceil, round: Math.round, abs: Math.abs, trunc: Math.trunc, sign: Math.sign,
  min: Math.min, max: Math.max, pow: Math.pow, sqrt: Math.sqrt,
};
const MATH_CONSTANTS: Record<string, number> = { PI: Math.PI, E: Math.E };
const UNITS = new Set([
  'year', 'years', 'y', 'quarter', 'quarters', 'Q', 'month', 'months', 'M', 'week', 'weeks', 'w', 'isoWeek', 'isoWeeks',
  'day', 'days', 'd', 'date', 'hour', 'hours', 'h', 'minute', 'minutes', 'm', 'second', 'seconds', 's',
  'millisecond', 'milliseconds', 'ms',
]);
const none = (a: Value[]) => a.length === 0;
/** Moment methods and how their arguments are checked; each returns a moment or a primitive. */
const MOMENT_METHODS: Record<string, (args: Value[]) => boolean> = {
  add: (a) => a.length === 2 && typeof a[0] === 'number' && isUnit(a[1]),
  subtract: (a) => a.length === 2 && typeof a[0] === 'number' && isUnit(a[1]),
  startOf: (a) => a.length === 1 && isUnit(a[0]),
  endOf: (a) => a.length === 1 && isUnit(a[0]),
  format: (a) => a.length === 0 || (a.length === 1 && typeof a[0] === 'string'),
  toISOString: none, valueOf: none, unix: none, utc: none, local: none, clone: none, isValid: none,
  year: none, quarter: none, month: none, date: none, day: none, isoWeekday: none, week: none, isoWeek: none,
  hour: none, minute: none, second: none, daysInMonth: none,
  diff: (a) => a.length >= 1 && a.length <= 3 && isDateLike(a[0]) && (a[1] === undefined || isUnit(a[1])) && (a[2] === undefined || typeof a[2] === 'boolean'),
  isBefore: (a) => a.length >= 1 && a.length <= 2 && isDateLike(a[0]) && (a[1] === undefined || isUnit(a[1])),
  isAfter: (a) => a.length >= 1 && a.length <= 2 && isDateLike(a[0]) && (a[1] === undefined || isUnit(a[1])),
  isSame: (a) => a.length >= 1 && a.length <= 2 && isDateLike(a[0]) && (a[1] === undefined || isUnit(a[1])),
};
const STRING_METHODS: Record<string, (s: string, args: Value[]) => Value> = {
  toUpperCase: (s, a) => (a.length ? unsupported() : s.toUpperCase()),
  toLowerCase: (s, a) => (a.length ? unsupported() : s.toLowerCase()),
  trim: (s, a) => (a.length ? unsupported() : s.trim()),
  // A length past the cap is not resolved: shortening it would give a different answer than JavaScript.
  padStart: (s, a) => s.padStart(capped(a[0], MAX_PAD), str(a[1] ?? ' ')),
  padEnd: (s, a) => s.padEnd(capped(a[0], MAX_PAD), str(a[1] ?? ' ')),
  slice: (s, a) => s.slice(num(a[0] ?? 0), a[1] === undefined ? undefined : num(a[1])),
  substring: (s, a) => s.substring(num(a[0] ?? 0), a[1] === undefined ? undefined : num(a[1])),
};

function unsupported(): never {
  throw new Unsupported();
}
function own<T>(table: Record<string, T>, name: unknown): T | undefined {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(table, name) ? table[name] : undefined;
}
function isUnit(v: Value): boolean {
  return typeof v === 'string' && UNITS.has(v);
}
function isDateLike(v: Value): boolean {
  return isMoment(v) || typeof v === 'string' || typeof v === 'number';
}
function isMoment(v: Value): v is MomentBox {
  return typeof v === 'object' && v !== null && v.kind === 'moment';
}
function num(v: Value): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v) > 1e9) unsupported();
  return v;
}
/** A number within [0, max], or not resolved at all. */
function capped(v: Value, max: number): number {
  const n = num(v);
  if (n < 0 || n > max) unsupported();
  return n;
}
function str(v: Value): string {
  if (typeof v !== 'string') unsupported();
  return v;
}
function primitive(v: Value): Exclude<Value, MomentBox> {
  if (isMoment(v)) unsupported();
  return v;
}
function box(m: moment.Moment): MomentBox {
  return { kind: 'moment', m };
}
/** A moment constructor argument: a string or number date, and an optional string format. Never an object. */
function momentArgs(args: Value[]): Array<string | number> {
  if (args.length > 2) unsupported();
  return args.map((a) => (typeof a === 'string' || typeof a === 'number' ? a : unsupported()));
}

function interpret(node: any): Value {
  switch (node?.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    case 'Identifier':
      if (node.name === 'undefined') return undefined;
      if (node.name === 'NaN') return NaN;
      if (node.name === 'Infinity') return Infinity;
      return unsupported();
    case 'TemplateLiteral': {
      let out = '';
      node.quasis.forEach((q: any, i: number) => {
        out += q.value.cooked ?? '';
        if (i < node.expressions.length) out += String(primitive(interpret(node.expressions[i])));
      });
      return out;
    }
    case 'UnaryExpression': {
      const v = primitive(interpret(node.argument));
      if (node.operator === '!') return !v;
      if (node.operator === '-') return -num(v);
      if (node.operator === '+') return typeof v === 'string' ? Number(v) : num(v);
      if (node.operator === 'typeof') return typeof v;
      return unsupported();
    }
    case 'BinaryExpression': {
      const a = primitive(interpret(node.left)) as any;
      const b = primitive(interpret(node.right)) as any;
      switch (node.operator) {
        case '+': return typeof a === 'string' || typeof b === 'string' ? String(a) + String(b) : num(a) + num(b);
        case '-': return num(a) - num(b);
        case '*': return num(a) * num(b);
        case '/': return num(a) / num(b);
        case '%': return num(a) % num(b);
        case '===': return a === b;
        case '!==': return a !== b;
        case '==': return a == b; // eslint-disable-line eqeqeq
        case '!=': return a != b; // eslint-disable-line eqeqeq
        case '<': return a < b;
        case '>': return a > b;
        case '<=': return a <= b;
        case '>=': return a >= b;
        default: return unsupported();
      }
    }
    case 'LogicalExpression': {
      const l = interpret(node.left);
      if (node.operator === '&&') return l ? interpret(node.right) : l;
      if (node.operator === '||') return l ? l : interpret(node.right);
      if (node.operator === '??') return l ?? interpret(node.right);
      return unsupported();
    }
    case 'ConditionalExpression':
      return interpret(node.test) ? interpret(node.consequent) : interpret(node.alternate);
    case 'MemberExpression': {
      if (node.computed) return unsupported();
      const name = node.property?.name;
      if (node.object?.type === 'Identifier' && node.object.name === 'Math') {
        const constant = own(MATH_CONSTANTS, name);
        return constant ?? unsupported();
      }
      const target = interpret(node.object);
      if (typeof target === 'string' && name === 'length') return target.length;
      return unsupported();
    }
    case 'CallExpression': {
      const args: Value[] = node.arguments.map((a: any) => (a.type === 'SpreadElement' ? unsupported() : interpret(a)));
      const callee = node.callee;
      if (callee.type === 'Identifier') {
        if (callee.name === 'moment') return box(moment(...momentArgs(args)));
        if (callee.name === 'String' && args.length === 1) return String(primitive(args[0]));
        if (callee.name === 'Number' && args.length === 1) return Number(primitive(args[0]));
        // No radix means JavaScript's own rule ("0x10" is 16), so pass exactly what was written.
        if (callee.name === 'parseInt' && args.length === 1) return parseInt(str(args[0]));
        if (callee.name === 'parseInt' && args.length === 2) return parseInt(str(args[0]), capped(args[1], 36));
        if (callee.name === 'parseFloat' && args.length === 1) return parseFloat(str(args[0]));
        return unsupported();
      }
      if (callee.type !== 'MemberExpression' || callee.computed) return unsupported();
      const name: string = callee.property?.name;
      const object = callee.object;
      if (object.type === 'Identifier' && object.name === 'moment') {
        if (name === 'utc') return box(moment.utc(...momentArgs(args)));
        if (name === 'unix' && args.length === 1) return box(moment.unix(num(args[0])));
        return unsupported();
      }
      if (object.type === 'Identifier' && object.name === 'Math') {
        const fn = own(MATH_FNS, name);
        return fn ? fn(...args.map((a) => num(a))) : unsupported();
      }
      if (object.type === 'Identifier' && object.name === 'Date' && name === 'now' && args.length === 0) return Date.now();
      if (object.type === 'Identifier' && object.name === 'JSON' && name === 'stringify' && args.length === 1) {
        return JSON.stringify(primitive(args[0]));
      }
      const target = interpret(object);
      if (isMoment(target)) {
        const check = own(MOMENT_METHODS, name);
        if (!check || !check(args)) return unsupported();
        // The instance was made by this interpreter, so a mutating method changes only it.
        const unwrapped = args.map((a) => (isMoment(a) ? a.m : a));
        const result = (target.m as unknown as Record<string, (...a: unknown[]) => unknown>)[name]!(...unwrapped);
        if (moment.isMoment(result)) return box(result);
        if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') return result;
        return unsupported();
      }
      if (typeof target === 'string') {
        const fn = own(STRING_METHODS, name);
        return fn ? fn(target, args) : unsupported();
      }
      if (typeof target === 'number') {
        // toFixed takes 0 to 100 digits; outside that JavaScript throws, so it is not resolved.
        if (name === 'toFixed' && args.length <= 1) return target.toFixed(args[0] === undefined ? 0 : capped(args[0], 100));
        if (name === 'toString' && args.length === 0) return String(target);
        return unsupported();
      }
      return unsupported();
    }
    default:
      return unsupported();
  }
}

// The same split the ToolJet server uses for a string with several bindings (util.service.ts, step c).
const SERVER_BINDING = /\{\{(.*?)\}\}/gs;

export interface StaticBindingResolution {
  /** Binding text (newlines flattened, as ToolJet looks it up) -> value. */
  resolved: Record<string, unknown>;
  /** Binding strings that read live state or could not be interpreted; ToolJet will see them as undefined. */
  unresolved: string[];
}

export function resolveStaticBindings(options: unknown): StaticBindingResolution {
  const resolved: Record<string, unknown> = {};
  const unresolved: string[] = [];
  const visit = (value: unknown): void => {
    if (typeof value === 'string') {
      if (!value.includes('{{') || !value.includes('}}')) return;
      const key = value.replace(/\n/g, ' ');
      if (key in resolved || unresolved.includes(key)) return;
      const outcome = resolveString(value);
      if (!outcome.ok) {
        unresolved.push(key);
        return;
      }
      resolved[key] = outcome.value;
      // The server fills a string with several bindings one binding at a time, by each binding's text.
      for (const [binding, v] of outcome.parts) resolved[binding.replace(/\n/g, ' ')] = v;
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') Object.values(value).forEach(visit);
  };
  visit(options);
  return { resolved, unresolved };
}

function resolveString(text: string): { ok: true; value: unknown; parts: Array<[string, unknown]> } | { ok: false } {
  const matches = [...text.matchAll(SERVER_BINDING)];
  if (!matches.length) return { ok: false };
  const parts: Array<[string, unknown]> = [];
  for (const m of matches) {
    const result = evaluate(m[1]!);
    if (!result.ok) return { ok: false };
    parts.push([m[0], result.value]);
  }
  if (matches.length === 1 && matches[0]![0] === text.trim()) return { ok: true, value: parts[0]![1], parts: [] };
  let i = 0;
  return { ok: true, value: text.replace(SERVER_BINDING, () => String(parts[i++]![1])), parts };
}

function evaluate(expression: string): { ok: true; value: unknown } | { ok: false } {
  if (expression.length > MAX_EXPRESSION_CHARS) return { ok: false };
  try {
    const value = interpret(parseExpression(expression));
    if (isMoment(value)) return { ok: true, value: value.m.toISOString() };
    if (typeof value === 'number' && !Number.isFinite(value)) return { ok: false };
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

/** The note for bindings a browser-free run could not resolve (component bindings have their own). */
export function unresolvedNote(bindings: string[]): string {
  const shown = bindings.slice(0, 3).map((b) => (b.length > 60 ? `${b.slice(0, 57)}...` : b)).join(', ');
  return `Browser-free run: ${bindings.length} binding(s) read live app state and ran as undefined (${shown}). ` +
    'Empty or failed results here do not show the viewer is wrong; check it in the viewer before rewriting the query.';
}

/** The options as ToolJet will run them: each string whose bindings all resolved replaced by its resolved value. */
export function applyResolvedBindings(options: unknown, resolved: Record<string, unknown>): unknown {
  if (typeof options === 'string') {
    if (!options.includes('{{') || !options.includes('}}')) return options;
    const key = options.replace(/\n/g, ' ');
    return Object.prototype.hasOwnProperty.call(resolved, key) ? resolved[key] : options;
  }
  if (Array.isArray(options)) return options.map((value) => applyResolvedBindings(value, resolved));
  if (options && typeof options === 'object') {
    return Object.fromEntries(Object.entries(options).map(([k, v]) => [k, applyResolvedBindings(v, resolved)]));
  }
  return options;
}

/** Values of single bindings (`{{...}}` keys), the text a binding contributes to its string. */
export function resolvedBindingValues(resolved: Record<string, unknown>): unknown[] {
  return Object.entries(resolved).filter(([key]) => /^\{\{(?:(?!\}\})[\s\S])*\}\}$/.test(key)).map(([, value]) => value);
}
