import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { codeAppBuildTool, codeAppInstallTool, missingStylesheet, resetCodeSessionForTests } from '../src/tools/codeApp.js';
import { codeContext, WORKSPACE } from './codeContext.js';

// Purchase Approvals B1 (2026-11-02): the model rewrote App/index.tsx without `import '../styles/globals.css'` and the
// app shipped unstyled; build, scan and render check all passed.
const FAKE_CLI = `
const args = process.argv.slice(2);
if (args[1] === 'check') { console.log(JSON.stringify({ problems: [], security: { gate: 'pass', counts: {}, findings: [] } })); process.exit(0); }
if (args[0] === 'library') { console.log('✓ TypeScript compiled (0 errors)'); process.exit(0); }
if (args[1] === 'dev') { console.log('Open: http://localhost/editor'); process.exit(0); }
console.log('Already at revision 1 (owner platform)');
`;

describe('the app entry must import its stylesheet', () => {
  let dir: string;
  const env = { ...process.env };
  const project = () => join(dir, 'apps', WORKSPACE, 'desk');
  const entry = (body: string) => writeFileSync(join(project(), 'frontend/src/App/index.tsx'), body);

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-mcp-css-'));
    writeFileSync(join(dir, 'cli.js'), FAKE_CLI);
    for (const d of ['frontend/src/App', 'frontend/src/styles', 'frontend/src/components/ui', 'frontend/styles']) mkdirSync(join(project(), d), { recursive: true });
    writeFileSync(join(project(), 'app.json'), JSON.stringify({ appId: 'app-1' }));
    writeFileSync(join(project(), 'frontend/src/styles/globals.css'), '@tailwind base;');
    Object.assign(process.env, { TOOLJET_CLI: join(dir, 'cli.js'), TOOLJET_CODE_APP_ROOT: join(dir, 'apps') });
    resetCodeSessionForTests();
  });
  afterEach(() => {
    process.env = { ...env };
    rmSync(dir, { recursive: true, force: true });
    resetCodeSessionForTests();
  });

  it('passes with the template import, in either quote style', () => {
    entry("import React from 'react';\nimport '../styles/globals.css';\nexport default function App() { return null; }\n");
    expect(missingStylesheet(project())).toBeUndefined();
    entry('import "../styles/globals.css";\n');
    expect(missingStylesheet(project())).toBeUndefined();
  });

  it('passes when another screen file imports it', () => {
    entry("export default function App() { return null; }\n");
    writeFileSync(join(project(), 'frontend/src/App/Shell.tsx'), "import '../styles/globals.css';\n");
    expect(missingStylesheet(project())).toBeUndefined();
  });

  it('names the missing import and how to put it back, also when it is only commented out', () => {
    entry("import React from 'react';\nexport default function App() { return null; }\n");
    expect(missingStylesheet(project())).toMatch(/Add `import '\.\.\/styles\/globals\.css';` back/);
    entry("// import '../styles/globals.css';\n/* import '../styles/globals.css'; */\nexport default function App() { return null; }\n");
    expect(missingStylesheet(project())).toMatch(/renders unstyled/);
  });

  it('holds no project to it that has no such stylesheet', () => {
    rmSync(join(project(), 'frontend/src/styles/globals.css'));
    entry("export default function App() { return null; }\n");
    expect(missingStylesheet(project())).toBeUndefined();
  });

  it('fails the build and refuses the install until the import is back', async () => {
    entry("export default function App() { return null; }\n");
    const build = JSON.parse((await codeAppBuildTool(codeContext()).handler({ name: 'desk' } as any)).content[0].text);
    expect(build.ok).toBe(false);
    expect(build.check[0]).toMatch(/stylesheet is not imported/);
    const install: any = await codeAppInstallTool(codeContext()).handler({ name: 'desk' } as any);
    expect(install.isError).toBe(true);
    expect(install.content[0].text).toMatch(/Not installed: .*stylesheet is not imported/);
    entry("import '../styles/globals.css';\nexport default function App() { return null; }\n");
    expect(JSON.parse((await codeAppBuildTool(codeContext()).handler({ name: 'desk' } as any)).content[0].text).ok).toBe(true);
    expect((await codeAppInstallTool(codeContext()).handler({ name: 'desk' } as any)).isError).toBeFalsy();
  });
});
