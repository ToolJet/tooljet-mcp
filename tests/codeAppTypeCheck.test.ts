import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codeAppBuildTool, codeAppReadFilesTool, codeAppScaffoldTool, codeAppWriteFilesTool, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { codeContext, DEPLOYMENT, WORKSPACE } from './codeContext.js';

/*
  The type check a write returns, and the build's compact errors. The fake CLI answers `library typecheck --json` with
  FAKE_TYPES (missing: an older CLI without the command) and `library build` with FAKE_BUILD.
*/
const APP = '22222222-2222-4222-8222-222222222222';
const FAKE_CLI = `
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_CLI_LOG, args.join(' ') + '\\n');
if (args[1] === 'init') {
  const dir = path.join(process.cwd(), args[2]);
  fs.mkdirSync(path.join(dir, 'frontend', 'src', 'App'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app.json'), '{"name":"x"}');
  fs.writeFileSync(path.join(dir, 'frontend', 'src', 'tooljet.gen.ts'), '// hooks');
  fs.writeFileSync(path.join(dir, 'frontend', 'src', 'App', 'index.tsx'), 'template');
  process.exit(0);
}
if (args[0] === 'library' && args[1] === 'typecheck') {
  if (!fs.existsSync(process.env.FAKE_TYPES)) { console.log(' ›   Error: command library:typecheck not found'); process.exit(2); }
  console.log(fs.readFileSync(process.env.FAKE_TYPES, 'utf8')); process.exit(1);
}
if (args[0] === 'library' && args[1] === 'build') { console.log(fs.readFileSync(process.env.FAKE_BUILD, 'utf8')); process.exit(1); }
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[1] === 'source-pull') { console.log('No source is stored on ToolJet for this version yet'); process.exit(0); }
console.log('ok');
`;
const text = (r: any) => r.content[0].text as string;

describe('type errors before and at the build', () => {
  let root: string;
  let log: string;
  let types: string;
  let buildOut: string;
  const env = { ...process.env };
  const calls = () => readFileSync(log, 'utf8').split('\n').filter(Boolean);
  const write = (args: object) => codeAppWriteFilesTool(codeContext()).handler({ app_id: APP, ...args } as any).then((r) => JSON.parse(text(r)));

  beforeEach(async () => {
    resetCodeSessionForTests();
    root = mkdtempSync(join(tmpdir(), 'code-app-types-'));
    log = join(root, 'calls.log');
    types = join(root, 'types.json');
    buildOut = join(root, 'build.txt');
    writeFileSync(log, '');
    writeFileSync(join(root, 'cli.js'), FAKE_CLI);
    mkdirSync(join(root, 'apps'));
    Object.assign(process.env, {
      TOOLJET_CLI: join(root, 'cli.js'),
      TOOLJET_CODE_APP_ROOT: join(root, 'apps'),
      FAKE_CLI_LOG: log,
      MCP_CODE_CLI_ENV_PASS: `${env.MCP_CODE_CLI_ENV_PASS},FAKE_TYPES,FAKE_BUILD`,
      FAKE_TYPES: types,
      FAKE_BUILD: buildOut,
      MCP_CODE_WRITE_TYPECHECK: '1',
    });
    await codeAppScaffoldTool(codeContext()).handler({ name: 'typed', display_name: 'Typed', app_id: APP });
    await codeAppReadFilesTool(codeContext()).handler({ app_id: APP, paths: ['frontend/src/App/index.tsx'] } as any);
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(root, { recursive: true, force: true });
  });

  it('a write returns the errors to fix, and imports of files not written yet apart', async () => {
    writeFileSync(
      types,
      JSON.stringify({
        typescript_errors: 2,
        problems: [
          { file: 'src/App/index.tsx', line: 7, column: 29, code: 'TS2307', message: "Cannot find module './VendorDetail' or its corresponding type declarations.", source: "import VendorDetail from './VendorDetail';" },
          { file: 'src/App/index.tsx', line: 40, column: 9, code: 'TS2322', message: "Type 'QueryError' is not assignable to type 'ReactNode'.", source: '<p>{rows.error}</p>' },
        ],
      })
    );
    const out = await write({ files: [{ path: 'frontend/src/App/index.tsx', content: 'export default 1;' }] });
    expect(out.written).toEqual(['frontend/src/App/index.tsx']);
    expect(out.type_check.errors).toBe(2);
    expect(out.type_check.not_written_yet).toEqual(['./VendorDetail (imported at frontend/src/App/index.tsx:7:29)']);
    expect(out.type_check.fix).toEqual([
      "frontend/src/App/index.tsx:40:9 TS2322 Type 'QueryError' is not assignable to type 'ReactNode'. | code: <p>{rows.error}</p> | fix: render error.message, not the error",
    ]);
    expect(calls()).toContain('library typecheck --json');
  });

  it('a clean write says so in one field', async () => {
    writeFileSync(types, JSON.stringify({ typescript_errors: 0, problems: [] }));
    expect((await write({ files: [{ path: 'frontend/src/App/a.tsx', content: 'export const a = 1;' }] })).type_check).toEqual({ errors: 0 });
  });

  it('an older CLI without the check: the write goes through without one', async () => {
    const out = await write({ files: [{ path: 'frontend/src/App/a.tsx', content: 'export const a = 1;' }] });
    expect(out.written).toEqual(['frontend/src/App/a.tsx']);
    expect(out.type_check).toBeUndefined();
  });

  it('no check for app.json alone, nor unless it is switched on', async () => {
    writeFileSync(types, JSON.stringify({ typescript_errors: 0, problems: [] }));
    await codeAppReadFilesTool(codeContext()).handler({ app_id: APP, paths: ['app.json'] } as any);
    expect((await write({ files: [{ path: 'app.json', content: JSON.stringify({ name: 'x', appId: APP, routes: [] }) }] })).type_check).toBeUndefined();
    delete process.env.MCP_CODE_WRITE_TYPECHECK;
    expect((await write({ files: [{ path: 'frontend/src/App/a.tsx', content: 'x' }] })).type_check).toBeUndefined();
    expect(calls().filter((c) => c.startsWith('library typecheck'))).toEqual([]);
  });

  it('the build lists every error on one line each, with the summary in place of the raw report', async () => {
    writeFileSync(
      buildOut,
      [
        'Building your component library...',
        '',
        '✗ Error : TypeScript compiled (1 errors)',
        '',
        "src/App/Tickets.tsx:261:177 - error TS2322: Type 'QueryError' is not assignable to type 'ReactNode'.",
        '',
        '261       <p>{tickets.error}</p>',
        '          ~~~~~~~~~~~~~~~',
        '',
        '✓ Bundle built: dist/index.js (619 KB)',
      ].join('\n')
    );
    const out = JSON.parse(text(await codeAppBuildTool(codeContext()).handler({ app_id: APP } as any)));
    expect(out.ok).toBe(false);
    expect(out.typescript_errors).toBe(1);
    expect(out.errors).toEqual([
      "frontend/src/App/Tickets.tsx:261:177 TS2322 Type 'QueryError' is not assignable to type 'ReactNode'. | code: <p>{tickets.error}</p> | fix: render error.message, not the error",
    ]);
    expect(out.build_output).toBe('✗ Error : TypeScript compiled (1 errors)\n✓ Bundle built: dist/index.js (619 KB)');
  });

  it('copies a linked SDK into the project once, before the build reads it', async () => {
    writeFileSync(buildOut, '✓ TypeScript compiled (0 errors)');
    const sdk = join(root, 'apps', DEPLOYMENT, WORKSPACE, 'typed', 'frontend', 'node_modules', '@tooljet');
    mkdirSync(sdk, { recursive: true });
    symlinkSync(root, join(sdk, 'custom-component-sdk'), 'dir');
    await codeAppBuildTool(codeContext()).handler({ app_id: APP } as any);
    await codeAppBuildTool(codeContext()).handler({ app_id: APP } as any);
    expect(calls().filter((c) => c === 'app install')).toHaveLength(2); // the scaffold's, then the copy, once
  });
});
