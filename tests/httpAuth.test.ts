import { describe, expect, it } from 'vitest';
import { checkBearerToken } from '../src/httpAuth.js';

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
