import type { Plugin } from 'graphql-yoga';
import { getContextForRequest } from '../context.js';

export function cookiePlugin(): Plugin {
  return {
    onResponse({ request, response }) {
      const ctx = getContextForRequest(request);
      if (!ctx?.pendingSetCookies?.length) return;
      for (const cookie of ctx.pendingSetCookies) {
        response.headers.append('Set-Cookie', cookie);
      }
    },
  };
}
