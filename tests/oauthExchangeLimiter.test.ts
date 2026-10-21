import { describe, expect, it } from 'vitest';
import { createExchangeLimiter } from '../src/oauthExchangeLimiter.js';
const request = (ip: string, forwarded?: string) => ({ socket: { remoteAddress: ip }, headers: { 'x-forwarded-for': forwarded } }) as any;
describe('exchange IP limits', () => {
  it('isolates addresses, ignores untrusted forwarded headers and expires buckets', () => {
    const limiter = createExchangeLimiter(1);
    expect(limiter.retryAfter(request('192.0.2.1', '198.51.100.1'), 0)).toBe(0);
    limiter.failed(request('192.0.2.1', '198.51.100.1'), 0);
    expect(limiter.retryAfter(request('192.0.2.1', '198.51.100.2'), 1)).toBe(60);
    expect(limiter.retryAfter(request('192.0.2.2'), 1)).toBe(0);
    expect(limiter.retryAfter(request('192.0.2.1'), 60000)).toBe(0);
  });
  it('uses the configured right-hand proxy hop and ignores caller-prepended values', () => {
    const limiter = createExchangeLimiter(1, 1);
    expect(limiter.retryAfter(request('192.0.2.10', '203.0.113.9, 198.51.100.1'), 0)).toBe(0);
    limiter.failed(request('192.0.2.10', '203.0.113.9, 198.51.100.1'), 0);
    expect(limiter.retryAfter(request('192.0.2.10', '203.0.113.8, 198.51.100.1'), 1)).toBe(60);
    expect(limiter.retryAfter(request('192.0.2.10', '198.51.100.2'), 1)).toBe(0);
  });
  it.each([[0, 0], [NaN, 0], [300, -1], [300, 11]])('rejects unsafe configuration %s/%s', (limit, hops) => {
    expect(() => createExchangeLimiter(limit, hops)).toThrow('Invalid');
  });
});
