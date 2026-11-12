import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { keepCodePage } from '../src/tools/codeApp.js';

// 2026-11-09: a build rewrote app.json's codePage from "home" to "support"; the install made a second page for the code
// and left the home page empty, so the app opened blank.

describe('an app.json write keeps the scaffold code page', () => {
  let dir: string;
  let file: string;
  const scaffolded = { name: 'Support Desk', codePage: { handle: 'home', name: 'Home' }, routes: [], appId: 'a1' };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'code-page-'));
    file = join(dir, 'app.json');
    writeFileSync(file, JSON.stringify(scaffolded, null, 2));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('puts the code page back and says so when a write renames it', () => {
    const sent = { ...scaffolded, codePage: { handle: 'support', name: 'Support' }, routes: [{ id: 'queue', path: '/', title: 'Queue' }] };
    const result = keepCodePage(file, JSON.stringify(sent));
    const written = JSON.parse(result.content);
    expect(written.codePage).toEqual({ handle: 'home', name: 'Home' });
    expect(written.routes).toEqual(sent.routes); // the rest of the write stands
    expect(result.note).toMatch(/codePage kept as "home"/);
  });

  it('restores a code page the write left out, without a note', () => {
    const { codePage: _dropped, ...rest } = scaffolded;
    const result = keepCodePage(file, JSON.stringify({ ...rest, name: 'Renamed' }));
    expect(JSON.parse(result.content)).toMatchObject({ name: 'Renamed', codePage: { handle: 'home', name: 'Home' } });
    expect(result.note).toBeUndefined();
  });

  it('leaves a write that keeps the code page as it was sent', () => {
    const content = JSON.stringify({ ...scaffolded, name: 'Helpdesk' });
    expect(keepCodePage(file, content)).toEqual({ content });
  });

  it('leaves the first write of a project and unreadable JSON alone', () => {
    expect(keepCodePage(join(dir, 'missing.json'), '{"codePage":{"handle":"x"}}').note).toBeUndefined();
    expect(keepCodePage(file, '{not json')).toEqual({ content: '{not json' });
  });
});
