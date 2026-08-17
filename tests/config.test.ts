import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  beforeEach(() => { for (const k of ['TOOLJET_URL','TOOLJET_APP_URL','TOOLJET_EMAIL','TOOLJET_PASSWORD']) delete process.env[k]; });

  it('applies defaults for URLs and reads creds', () => {
    process.env.TOOLJET_EMAIL = 'a@b.com';
    process.env.TOOLJET_PASSWORD = 'pw';
    const c = loadConfig();
    expect(c.apiUrl).toBe('http://localhost:3000');
    expect(c.appUrl).toBe('http://localhost:8082');
    expect(c.email).toBe('a@b.com');
  });

  it('throws when creds missing', () => {
    expect(() => loadConfig()).toThrow(/TOOLJET_EMAIL/);
  });
});
