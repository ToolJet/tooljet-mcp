/*
  The errors a Code mode build or type check reports, made compact enough that one round can fix all of them: one line
  each with file, line, code, message, the line of code and, for the mistakes that recur, the fix.

  Ranked from the Code mode builds of 2026-11-04 (126 builds, 567 code_app_build calls): an import of a file not written yet (13 rounds), implicit any (6), a field the row
  type does not have (5), a bundle syntax error (5), a missing named export (4), a stylesheet error (4), icon props typed
  narrower than lucide's (4), rendering a QueryError (3), and query data used before it loads (2). TypeScript's own
  report spends four lines and a squiggle on each; the build kept up to 12,000 characters of it.
*/

export interface BuildProblem {
  /** frontend/src/App/index.tsx:12:5, the path a write takes */
  at: string;
  /** TS2322, ESBUILD (a bundle error) or CSS */
  code: string;
  message: string;
  source?: string;
  fix?: string;
}

const TS_LINE = /^(\S+?):(\d+):(\d+) - error (TS\d+): (.*)$/;
const ESBUILD_LINE = /^(\S+?):(\d+):(\d+): ERROR: (.*)$/;
// A stylesheet error from the build's PostCSS plugin names the file by its absolute path.
const CSS_IN_PLUGIN = /^\[plugin: [\w-]+\] (?:.*\/frontend\/)?(\S+?\.css):(\d+):(\d+): (.*)$/;

const MAX_MESSAGE = 300;
const clipText = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}...` : text);
const inFrontend = (file: string) => (file.startsWith('frontend/') ? file : `frontend/${file}`);

/** The fix for a mistake that recurs, when the message alone does not say it. */
export function fixFor(code: string, message: string): string | undefined {
  if (/custom-component-sdk/.test(message) && /Cannot find module|Could not resolve/.test(message))
    return "the SDK's types are missing on this server, not in the code: never declare the module yourself; build again";
  if (/Cannot find module '\.{1,2}\/|Could not resolve "\.{1,2}\//.test(message))
    return 'no such file: write it (files: [{ path, content }]) or correct the path';
  if (/Could not resolve "@tooljet\//.test(message))
    return 'no such package: the SDK is @tooljet/custom-component-sdk, and data comes from ../tooljet.gen (useAppQuery)';
  if (/has no exported member|No matching export/.test(message))
    return 'export that name from the file it is imported from, or import a name the file exports';
  if (code === 'TS7006')
    return 'give the parameter a type, or type the list it comes from (a Row type from tooljet.gen)';
  if (/'QueryError' is not assignable to type 'ReactNode'/.test(message)) return 'render error.message, not the error';
  if (/LucideIcon/.test(message))
    return "type the icon prop as LucideIcon: import type { LucideIcon } from 'lucide-react'";
  if (/\.data' is possibly 'undefined'/.test(message))
    return 'data is undefined until the first run: const rows = q.data ?? []';
  if (code === 'TS18047' || /'null' is not assignable/.test(message))
    return "a nullable column is T | null in its Row type: check for null, or use ?? ''";
  if (code === 'TS2339' && /on type '\{|Row(\[\])?'/.test(message))
    return 'not a field of this row: use only the fields its Row type in tooljet.gen lists';
  if (/has already been declared|Duplicate identifier|Cannot redeclare/.test(message)) return 'remove one of the two declarations';
  if (code === 'CSS' && /Unknown word/.test(message)) return 'a stray */ or an unclosed comment or rule';
  return undefined;
}

/** A route id routePath does not know: the message names the union, not the function, so the source line decides. */
const routeFix = (p: BuildProblem): BuildProblem =>
  !p.fix && p.code === 'TS2345' && /routePath\(/.test(p.source ?? '')
    ? { ...p, fix: "add the route to app.json's routes (the build refreshes ROUTES), or use an id it has" }
    : p;

/** Every error in a build's or check's output, in the order given; empty when it holds none this can read. */
export function parseBuildProblems(output: string): BuildProblem[] {
  const lines = output.split('\n');
  const problems: BuildProblem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const ts = TS_LINE.exec(line);
    if (ts) {
      // The message's own continuation lines, then a blank, then "<line number> <code>" and the squiggle.
      const message = [ts[5]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && !TS_LINE.test(lines[j].trim()) && !/^\d+ /.test(lines[j].trim())) {
        message.push(lines[j].trim());
        j++;
      }
      while (j < lines.length && !lines[j].trim()) j++;
      const code = new RegExp(`^${ts[2]} (.*)$`).exec(lines[j]?.trim() ?? '');
      problems.push({
        at: `${inFrontend(ts[1])}:${ts[2]}:${ts[3]}`,
        code: ts[4],
        message: clipText(message.slice(0, 3).join(' / '), MAX_MESSAGE),
        ...(code ? { source: clipText(code[1].trim(), 160) } : {}),
      });
      continue;
    }
    const es = ESBUILD_LINE.exec(line);
    if (es) {
      const css = CSS_IN_PLUGIN.exec(es[4]);
      problems.push(
        css
          ? { at: `${inFrontend(css[1])}:${css[2]}:${css[3]}`, code: 'CSS', message: clipText(css[4], MAX_MESSAGE) }
          : { at: `${inFrontend(es[1])}:${es[2]}:${es[3]}`, code: 'ESBUILD', message: clipText(es[4], MAX_MESSAGE) }
      );
    }
  }
  return problems.map((p) => routeFix({ ...p, ...(fixFor(p.code, p.message) ? { fix: fixFor(p.code, p.message) } : {}) }));
}

/** A problem as `tooljet library typecheck --json` gives it. */
export interface CheckedProblem {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  source?: string;
}

export const fromChecked = (p: CheckedProblem): BuildProblem =>
  routeFix({
    at: `${inFrontend(p.file)}:${p.line}:${p.column}`,
    code: p.code,
    message: clipText(p.message.split('\n').slice(0, 3).map((l) => l.trim()).join(' / '), MAX_MESSAGE),
    ...(p.source ? { source: p.source } : {}),
    ...(fixFor(p.code, p.message) ? { fix: fixFor(p.code, p.message) } : {}),
  });

/**
 * One line per error: `frontend/src/App/index.tsx:12:5 TS2322 <message> | code: <line> | fix: <fix>`. The same error
 * on several lines of one file is one entry (`:12:5, :40:9`), so a list of 40 implicit anys reads as a few.
 */
export function formatProblems(problems: BuildProblem[], max = 40): string[] {
  const groups = new Map<string, { first: BuildProblem; at: string[] }>();
  for (const p of problems) {
    const file = p.at.replace(/:\d+:\d+$/, '');
    const key = `${file}\0${p.code}\0${p.message}`;
    const group = groups.get(key);
    if (group) group.at.push(p.at.slice(file.length));
    else groups.set(key, { first: p, at: [p.at] });
  }
  const lines = [...groups.values()].map(({ first, at }) =>
    [`${at.join(', ')} ${first.code} ${first.message}`, first.source && `code: ${first.source}`, first.fix && `fix: ${first.fix}`]
      .filter(Boolean)
      .join(' | ')
  );
  return lines.length > max ? [...lines.slice(0, max), `... and ${lines.length - max} more`] : lines;
}

/** The lines of a build's output that are not part of an error: the summary (counts, manifest, bundle, warnings). */
export function buildSummary(output: string): string {
  const lines = output.split('\n').map((l) => l.trimEnd());
  const keep = lines.filter((l) => /^\s*(✗|✓|⚠)/.test(l) || /Build completed in/.test(l));
  return keep.join('\n');
}
