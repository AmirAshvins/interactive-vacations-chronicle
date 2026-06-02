interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/** Returns true if the request is allowed, false if rate limited. */
export function consumeRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) return false;
  return true;
}

export function rateLimitHeaders(key: string, max: number, windowMs: number): Record<string, string> {
  const bucket = buckets.get(key);
  const remaining = bucket ? Math.max(0, max - bucket.count) : max;
  const reset = bucket ? Math.ceil(bucket.resetAt / 1000) : Math.ceil((Date.now() + windowMs) / 1000);
  return {
    'X-RateLimit-Limit': String(max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(reset),
  };
}
