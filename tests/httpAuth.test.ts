import { describe, expect, it } from 'vitest';
import { bearerValue, checkBearerToken } from '../src/httpAuth.js';

describe('checkBearerToken', () => {
  it('accepts the exact configured token', () => {
    expect(checkBearerToken('Bearer secret-token', 'secret-token')).toBe(true);
  });

  it('rejects a missing header', () => {
    expect(checkBearerToken(undefined, 'secret-token')).toBe(false);
  });

  it('rejects the wrong token', () => {
    expect(checkBearerToken('Bearer wrong', 'secret-token')).toBe(false);
  });

  it('rejects a non-Bearer scheme', () => {
    expect(checkBearerToken('Basic secret-token', 'secret-token')).toBe(false);
  });

  it('rejects a header with no token', () => {
    expect(checkBearerToken('Bearer', 'secret-token')).toBe(false);
  });

  it('rejects a token that only differs in length', () => {
    expect(checkBearerToken('Bearer secret-token-extra', 'secret-token')).toBe(false);
  });
});

describe('bearerValue', () => {
  it('extracts the token from a well-formed header', () => {
    expect(bearerValue('Bearer tj_pat_abc')).toBe('tj_pat_abc');
  });

  it('returns undefined when absent or not a bearer, so a malformed header never becomes a credential', () => {
    expect(bearerValue(undefined)).toBeUndefined();
    expect(bearerValue('Basic abc')).toBeUndefined();
    expect(bearerValue('Bearer')).toBeUndefined();
    expect(bearerValue('Bearer ')).toBeUndefined();
  });
});

