import { describe, expect, it } from 'vitest';
import { consumeRateLimit, getClientIp, rateLimitHeaders } from './rateLimit.js';

describe('rateLimit', () => {
  it('extracts the first forwarded IP', () => {
    const request = new Request('http://localhost/graphql', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(request)).toBe('1.2.3.4');
  });

  it('allows requests until the limit is exceeded', () => {
    const key = `test-${Date.now()}-allow`;
    const max = 3;
    const windowMs = 60_000;

    expect(consumeRateLimit(key, max, windowMs)).toBe(true);
    expect(consumeRateLimit(key, max, windowMs)).toBe(true);
    expect(consumeRateLimit(key, max, windowMs)).toBe(true);
    expect(consumeRateLimit(key, max, windowMs)).toBe(false);
  });

  it('returns rate limit headers', () => {
    const key = `test-${Date.now()}-headers`;
    consumeRateLimit(key, 5, 60_000);
    const headers = rateLimitHeaders(key, 5, 60_000);

    expect(headers['X-RateLimit-Limit']).toBe('5');
    expect(Number(headers['X-RateLimit-Remaining'])).toBeLessThanOrEqual(5);
    expect(Number(headers['X-RateLimit-Reset'])).toBeGreaterThan(0);
  });
});
