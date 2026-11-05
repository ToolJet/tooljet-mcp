import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import * as published from '@babel/parser';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parserSourcePlugin } from '../scripts/reviewable-bundle.mjs';

let parser: typeof published;
let directory: string;
beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'parser-packaging-'));
  const output = await build({
    stdin: { contents: 'export {parse, parseExpression, tokTypes} from "@babel/parser";', resolveDir: process.cwd() },
    bundle: true, platform: 'node', target: 'node20', format: 'esm', write: false,
    plugins: [parserSourcePlugin()],
    define: { 'process.env.BABEL_8_BREAKING': 'false', 'process.env.IS_PUBLISH': 'true' },
  });
  const file = join(directory, 'parser.mjs');
  writeFileSync(file, output.outputFiles[0].contents);
  parser = await import(/* @vite-ignore */ pathToFileURL(file).href);
});
afterAll(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });

const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
describe('modular parser matches the published parser', () => {
  const cases: Array<[string, published.ParserOptions]> = [
    ['const amount = items?.[0]?.price ?? 0; return amount * 3;', { sourceType: 'script', allowReturnOutsideFunction: true }],
    ['await queries.loadOrders.run(); const {code: label} = record;', { sourceType: 'script', allowAwaitOutsideFunction: true }],
    ['export class Vessel { #fuel = 2; getFuel = () => this.#fuel; }', { sourceType: 'module', tokens: true, ranges: true }],
    ['const pattern = /[a-z]+/giu; const text = `Hello ${name}`;', { attachComment: true }],
    ['// sample\nconst item = <section title="status">{value}</section>;', { plugins: ['jsx'] }],
    ['interface Parcel { code: string } const value: Parcel = {code: "P7"};', { plugins: ['typescript'] }],
    ['type Parcel = {code: string}; const value: Parcel = {code: "P8"};', { plugins: ['flow'] }],
    ['let code; let code;', { errorRecovery: true }],
    ['return 5;', { sourceType: 'script', allowReturnOutsideFunction: true, startLine: 4, startColumn: 2, startIndex: 30 }],
  ];
  it.each(cases)('preserves ASTs for %s', (source, options) => {
    expect(plain(parser.parse(source, options))).toEqual(plain(published.parse(source, options)));
  });
  it.each(['items.map(row => row.total)', '({ title: "Harbor", count: 4 })', 'value?.name ?? "unknown"'])('preserves expressions: %s', (source) => {
    expect(plain(parser.parseExpression(source))).toEqual(plain(published.parseExpression(source)));
  });
  it.each(['const = ;', 'let a = "unterminated', 'function broken( {'])('preserves syntax failures: %s', (source) => {
    const failure = (implementation: typeof published) => {
      try { implementation.parse(source); } catch (error: any) {
        return { message: error.message, code: error.code, reasonCode: error.reasonCode, pos: error.pos, loc: plain(error.loc) };
      }
      throw new Error('Expected a syntax error');
    };
    expect(failure(parser)).toEqual(failure(published));
  });
});
