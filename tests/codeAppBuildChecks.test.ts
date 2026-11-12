import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { badRouteHandles, nativeSelects, sdkRedeclared } from '../src/tools/codeApp.js';

const project = (routes: { id: string }[]): string => {
  const dir = mkdtempSync(join(tmpdir(), 'build-checks-'));
  writeFileSync(join(dir, 'app.json'), JSON.stringify({ routes }));
  return dir;
};

describe('badRouteHandles', () => {
  it('passes kebab-case ids', () => {
    expect(badRouteHandles(project([{ id: 'home' }, { id: 'new-lead' }, { id: 'q3' }]))).toEqual([]);
  });

  it.each(['new_lead', 'NewLead', '-lead', 'new lead'])('names %s and what to use', (id) => {
    const problems = badRouteHandles(project([{ id: 'home' }, { id }]));
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(`"${id}"`);
    expect(problems[0]).toMatch(/such as "[a-z0-9][a-z0-9-]*"/);
  });

  it('has nothing to say without an app.json', () => {
    expect(badRouteHandles(mkdtempSync(join(tmpdir(), 'build-checks-')))).toEqual([]);
  });
});

describe('nativeSelects', () => {
  const app = (kit: boolean, screen: string): string => {
    const dir = mkdtempSync(join(tmpdir(), 'build-checks-'));
    mkdirSync(join(dir, 'frontend/src/components/ui'), { recursive: true });
    mkdirSync(join(dir, 'frontend/src/App'), { recursive: true });
    if (kit) writeFileSync(join(dir, 'frontend/src/components/ui/select.tsx'), 'export const S = <select />;');
    writeFileSync(join(dir, 'frontend/src/App/Home.tsx'), screen);
    return dir;
  };

  it('finds one in a screen, by line', () => {
    expect(nativeSelects(app(true, 'const a = 1;\nreturn <select value={a}>;'))).toEqual(['frontend/src/App/Home.tsx:2']);
  });

  it('ignores the kit itself, and a project without the kit', () => {
    expect(nativeSelects(app(true, 'return <Select />;'))).toEqual([]);
    expect(nativeSelects(app(false, 'return <select />;'))).toEqual([]);
  });
});

describe('sdkRedeclared', () => {
  const app = (files: Record<string, string>): string => {
    const dir = mkdtempSync(join(tmpdir(), 'build-checks-'));
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(join(dir, 'frontend/src', rel, '..'), { recursive: true });
      writeFileSync(join(dir, 'frontend/src', rel), text);
    }
    return dir;
  };

  // The workaround 15 builds wrote on 2026-11-04, while the SDK's types were out of the build's reach.
  it('names a file that declares the SDK module itself', () => {
    const dir = app({
      'sdk.d.ts': "declare module '@tooljet/custom-component-sdk' {\n  export interface QueryResult { error: string | null }\n}\n",
      'App/index.tsx': "import { ToolJet } from '@tooljet/custom-component-sdk';\n",
    });
    expect(sdkRedeclared(dir)).toEqual([
      expect.stringMatching(/^frontend\/src\/sdk\.d\.ts: declares @tooljet\/custom-component-sdk itself, which hides the SDK's real types/),
    ]);
  });

  it('leaves imports of the SDK and other module declarations alone', () => {
    expect(sdkRedeclared(app({ 'global.d.ts': "declare module '*.css';\n", 'App/index.tsx': "import { ToolJet } from '@tooljet/custom-component-sdk';\n" }))).toEqual([]);
    expect(sdkRedeclared(mkdtempSync(join(tmpdir(), 'build-checks-')))).toEqual([]);
  });
});
