import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  beforeEach(() => { for (const k of ['TOOLJET_URL','TOOLJET_APP_URL','TOOLJET_PAT']) delete process.env[k]; });

  it('applies defaults for URLs and reads the token', () => {
    process.env.TOOLJET_PAT = 'tj_pat_test';
    const c = loadConfig();
    expect(c.apiUrl).toBe('http://localhost:3000');
    expect(c.appUrl).toBe('http://localhost:8082');
    expect(c.pat).toBe('tj_pat_test');
  });

  it('throws when TOOLJET_PAT is missing', () => {
    expect(() => loadConfig()).toThrow(/TOOLJET_PAT/);
  });
});
