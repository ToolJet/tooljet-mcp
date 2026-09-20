import { ConfirmPrompt, PasswordPrompt, SelectPrompt, TextPrompt } from '@clack/core';
import * as clack from '@clack/prompts';
import { homedir } from 'node:os';
import pc from 'picocolors';
import { TOOLJET_MCP_VERSION } from '../runtimeFreshness.js';

/** Pastel palette (user-picked accent #6286FF); conventional ANSI colours where truecolor is missing. */
const BRAND_RGB = [98, 134, 255] as const;
const GOOD_RGB = [134, 239, 172] as const; // mint
const WARN_RGB = [253, 230, 138] as const; // soft amber
const BAD_RGB = [252, 165, 165] as const; // soft coral
/** The mark's own blue, from the logo SVG. The official light and dark logos both use it. */
const LOGO_RGB = [67, 104, 227] as const;

function colorEnabled(): boolean {
  return pc.isColorSupported;
}

function trueColor(): boolean {
  const ct = (process.env.COLORTERM ?? '').toLowerCase();
  return ct.includes('truecolor') || ct.includes('24bit') || process.env.TERM_PROGRAM === 'iTerm.app' ||
    process.env.TERM_PROGRAM === 'vscode' || Boolean(process.env.WT_SESSION);
}

function tint(rgb: readonly [number, number, number], text: string, fallback: (t: string) => string): string {
  if (!colorEnabled()) return text;
  if (!trueColor()) return fallback(text);
  return `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}\x1b[39m`;
}

export const accent = (text: string): string => tint(BRAND_RGB, text, pc.blue);

const unicode = clack.unicode;
const sym = (u: string, a: string) => (unicode ? u : a);
const BAR = sym('│', '|');
const BAR_END = sym('└', '—');
const POINTER = sym('❯', '>');
const RADIO_ON = sym('●', '>');
const RADIO_OFF = sym('○', ' ');

export const dim = pc.dim;
export const bold = pc.bold;
export const good = (t: string) => tint(GOOD_RGB, t, pc.green);
export const warn = (t: string) => tint(WARN_RGB, t, pc.yellow);
export const bad = (t: string) => tint(BAD_RGB, t, pc.red);

export function intro(subtitle?: string): void {
  clack.intro(`${accent(bold('ToolJet MCP'))}${subtitle ? dim(`  ${subtitle}`) : ''}`);
}

/** The mark as a star mosaic, hand-tuned.
    Plain ASCII on purpose — block characters missing from a font fall back double-width and mangle. */
export const MARK = [
  '*****        ****',
  ' *****     ********',
  '  *****        *****',
  '   *****        *****',
  '  *****        *****',
  ' *****   **********',
  '*****   **********',
];

/** Brand mark and info block. The text uses the terminal's own foreground, so it follows the theme. */
export function logo(info: string[] = []): void {
  const width = Math.max(...MARK.map((r) => r.length));
  const fit = (line: string) => (line.length > 76 - width - 3 ? `${line.slice(0, 76 - width - 4)}…` : line);
  const text = [`${bold('ToolJet MCP')} ${dim(`v${TOOLJET_MCP_VERSION}`)}`, ...info.map((line) => dim(fit(line)))];
  const top = Math.max(0, Math.floor((MARK.length - text.length) / 2));
  const rows = MARK.map((row, i) => {
    const beside = text[i - top];
    return beside ? `${tint(LOGO_RGB, row, pc.blue)}${' '.repeat(width - row.length + 3)}${beside}` : tint(LOGO_RGB, row, pc.blue);
  });
  process.stdout.write(`\n${rows.join('\n')}\n\n`);
}

export const outro = (msg: string) => clack.outro(msg);
export const log = clack.log;
export const isCancel = clack.isCancel;

export function spinner() {
  return clack.spinner({
    // Braille frames spin smoothly; clack's default quarter-circles wobble.
    frames: unicode ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] : undefined,
    styleFrame: (frame) => accent(frame),
  });
}

/** One frame for every input: clack's stock prompts hard-code cyan, so they are drawn here in the accent. */
function fieldFrame(state: string, message: string, body: string, error?: string): string {
  if (state === 'submit' || state === 'cancel') {
    return `${dim(BAR)}\n${dim(sym('◇', 'o'))}  ${message}\n${dim(BAR)}  ${body}`;
  }
  const foot = state === 'error' ? `${accent(BAR_END)}  ${warn(error ?? '')}` : accent(BAR_END);
  return `${dim(BAR)}\n${accent(sym('◆', '*'))}  ${message}\n${accent(BAR)}  ${body}\n${foot}\n`;
}

/** A placeholder the way clack draws one: cursor on the first character, the rest faint. */
function ghost(placeholder: string): string {
  if (!placeholder) return '';
  return colorEnabled() ? `\x1b[7m${placeholder[0]}\x1b[27m${dim(placeholder.slice(1))}` : placeholder;
}

export async function text(opts: {
  message: string;
  placeholder?: string;
  validate?: (value: string | undefined) => string | undefined;
}): Promise<string | symbol> {
  const prompt = new TextPrompt({
    validate: opts.validate,
    render() {
      const body = this.userInput === '' ? ghost(opts.placeholder ?? '') : this.userInputWithCursor;
      const kept = this.state === 'submit' || this.state === 'cancel' ? dim(this.userInput) : body;
      return fieldFrame(this.state, opts.message, kept, this.error);
    },
  });
  return (await prompt.prompt()) as string | symbol;
}

export async function confirm(opts: { message: string; initialValue?: boolean }): Promise<boolean | symbol> {
  const prompt = new ConfirmPrompt({
    initialValue: opts.initialValue ?? false,
    active: 'Yes',
    inactive: 'No',
    render() {
      if (this.state === 'submit' || this.state === 'cancel') {
        return fieldFrame(this.state, opts.message, dim(this.value ? 'Yes' : 'No'));
      }
      const pick = (label: string, on: boolean) => (on ? `${accent(RADIO_ON)} ${bold(label)}` : `${dim(RADIO_OFF)} ${dim(label)}`);
      const yes = this.value === true;
      return fieldFrame(this.state, opts.message, `${pick('Yes', yes)} ${dim('/')} ${pick('No', !yes)}`);
    },
  });
  return (await prompt.prompt()) as boolean | symbol;
}

/** Masked input, marked with a key. The only way a token ever enters this tool. */
export async function secret(message: string): Promise<string | symbol> {
  const title = `${message} ${sym('🔑', '')}`.trimEnd();
  const prompt = new PasswordPrompt({
    mask: sym('•', '*'),
    render() {
      const kept = this.state === 'submit' || this.state === 'cancel' ? dim(this.masked) : this.userInputWithCursor;
      return fieldFrame(this.state, title, kept, this.error);
    },
  });
  return (await prompt.prompt()) as string | symbol;
}

export interface Choice<T> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * Single choice: Enter acts on the highlighted row. The list erases itself afterwards,
 * so moving through menus leaves no trail — only results stay on screen.
 */
export async function select<T>(message: string, options: Choice<T>[], initialValue?: T, escape = 'back'): Promise<T | symbol> {
  const prompt = new SelectPrompt<Choice<T>>({
    options,
    initialValue,
    render() {
      if (this.state === 'submit' || this.state === 'cancel') return '';
      // Pad labels so the hints line up as a column.
      const width = Math.max(...options.map((o) => (o.hint ? o.label.length : 0)));
      const rows = options.map((o, i) => {
        const hint = o.hint ? `${' '.repeat(width - o.label.length)}   ${dim(o.hint)}` : '';
        return i === this.cursor
          ? `${accent(BAR)}  ${accent(`${POINTER} ${RADIO_ON}`)} ${bold(o.label)}${hint}`
          : `${accent(BAR)}    ${dim(RADIO_OFF)} ${dim(o.label)}${hint}`;
      });
      const head = `${dim(BAR)}\n${accent(sym('◆', '*'))}  ${message}\n`;
      return `${head}${rows.join('\n')}\n${accent(BAR_END)}  ${dim(`↑↓ move · enter select · esc ${escape}`)}\n`;
    },
  });
  const picked = (await prompt.prompt()) as T | symbol;
  // Closing a prompt writes one newline; step back over it so the next thing starts where the list was.
  process.stdout.write('\x1b[1A');
  return picked;
}

/** Text input styled like clack's own, plus a suggestion that Tab fills in — clack's text() has no tab-complete.
    While empty it shows the suggestion as a placeholder with a dim `// …` comment beside it. */
export async function textSuggest(opts: {
  message: string;
  suggestion: string;
  comment: string;
  validate?: (value: string | undefined) => string | undefined;
}): Promise<string | symbol> {
  const prompt = new TextPrompt({
    validate: opts.validate,
    render() {
      const body = this.state === 'submit' || this.state === 'cancel'
        ? dim(this.userInput)
        : this.userInput === '' ? `${ghost(opts.suggestion)}${dim(`   ${opts.comment}`)}` : this.userInputWithCursor;
      return fieldFrame(this.state, opts.message, body, this.error);
    },
  });
  prompt.on('key', (_char, key) => {
    if (key?.name !== 'tab') return;
    // The base prompt has already typed the tab into the input; strip it, and fill the suggestion when empty.
    // _setUserInput is private to @clack/core (verified against 1.5.1) — recheck Tab-fill on upgrades.
    const typed = prompt.userInput.replace(/\t/g, '');
    (prompt as unknown as { _setUserInput(value: string, updateCursor?: boolean): void })._setUserInput(typed === '' ? opts.suggestion : typed, true);
  });
  return (await prompt.prompt()) as string | symbol;
}

/** A result that stays on screen: a title, then dim detail lines. */
export function result(ok: boolean, title: string, details: string[] = []): void {
  const body = [title, ...details.map((d) => dim(d))].join('\n');
  if (ok) clack.log.success(body);
  else clack.log.error(body);
}

/** Text a person will copy: printed with no border or gutter, so a mouse selection stays clean. */
export function copyable(block: string): void {
  process.stdout.write(`\n${block}\n`);
}

/** Show a path the way people write it. */
export function shortPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

/** Aligned two-column rows for plain (non-interactive) output. */
export function table(rows: string[][]): string {
  const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
  const widths: number[] = [];
  for (const row of rows) row.forEach((c, i) => (widths[i] = Math.max(widths[i] ?? 0, strip(c).length)));
  return rows
    .map((row) => row.map((c, i) => (i === row.length - 1 ? c : c + ' '.repeat(widths[i] - strip(c).length))).join('  '))
    .join('\n');
}

export const interactive = (): boolean => Boolean(process.stdin.isTTY && process.stdout.isTTY);

/** Run on the alternate screen (like less/vim): closing it restores the terminal with no trail. */
export async function onAltScreen<T>(run: () => Promise<T>): Promise<T> {
  process.stdout.write('\x1b[?1049h\x1b[H');
  const restore = () => process.stdout.write('\x1b[?1049l');
  process.once('exit', restore);
  try {
    return await run();
  } finally {
    process.removeListener('exit', restore);
    restore();
  }
}
