import type { Plugin } from 'graphql-yoga';
import { env } from '../env.js';
import { consumeRateLimit, getClientIp, rateLimitHeaders } from '../lib/rateLimit.js';

const EXEMPT_PATHS = new Set(['/health']);

export function rateLimitPlugin(): Plugin {
  return {
    onRequest({ request, url, endResponse }) {
      const pathname = url.pathname;
      if (EXEMPT_PATHS.has(pathname)) return;
      if (pathname.startsWith('/storage/')) return;

      const ip = getClientIp(request);
      const key = `ip:${ip}`;
      const allowed = consumeRateLimit(
        key,
        env.RATE_LIMIT_MAX,
        env.RATE_LIMIT_WINDOW_MS,
      );

      if (!allowed) {
        const headers = {
          'Content-Type': 'application/json',
          ...rateLimitHeaders(key, env.RATE_LIMIT_MAX, env.RATE_LIMIT_WINDOW_MS),
        };
        endResponse(
          new Response(
            JSON.stringify({
              errors: [{ message: 'Too many requests', extensions: { code: 'RATE_LIMITED' } }],
            }),
            { status: 429, headers },
          ),
        );
      }
    },
  };
}
