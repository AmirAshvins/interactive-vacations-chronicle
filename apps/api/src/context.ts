import type { YogaInitialContext } from 'graphql-yoga';
import { lucia, type AuthSession, type AuthUser } from './auth/lucia.js';
import { verifyAccessToken } from './auth/jwt.js';
import { db, type Database } from './db/index.js';

const contextByRequest = new WeakMap<Request, AppContext>();

export function getContextForRequest(request: Request): AppContext | undefined {
  return contextByRequest.get(request);
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
}

export interface AppContext extends AuthState {
  db: Database;
  request: Request;
  /** Set by auth mutations; consumed by response plugin */
  pendingSetCookies: string[];
}

export async function createAppContext(request: Request): Promise<AppContext> {
  const pendingSetCookies: string[] = [];
  let session: AuthSession | null = null;
  let user: AuthUser | null = null;

  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (bearer) {
    const payload = await verifyAccessToken(bearer);
    if (payload) {
      const result = await lucia.validateSession(payload.sid);
      if (result.session && result.user && result.user.id === payload.sub) {
        session = result.session;
        user = result.user;
      }
    }
  }

  if (!session) {
    const sessionId = lucia.readSessionCookie(request.headers.get('Cookie') ?? '');
    if (sessionId) {
      const result = await lucia.validateSession(sessionId);
      session = result.session;
      user = result.user;
      if (session?.fresh) {
        pendingSetCookies.push(lucia.createSessionCookie(session.id).serialize());
      }
      if (!session) {
        pendingSetCookies.push(lucia.createBlankSessionCookie().serialize());
      }
    }
  }

  const ctx: AppContext = { db, user, session, pendingSetCookies, request };
  contextByRequest.set(request, ctx);
  return ctx;
}

export function createContextFactory() {
  return async (yogaContext: YogaInitialContext): Promise<AppContext> => {
    const ctx = await createAppContext(yogaContext.request);
    return ctx;
  };
}

export async function createWsContext(
  connectionParams: Record<string, unknown> | undefined,
): Promise<AppContext> {
  const raw = connectionParams?.Authorization;
  const header =
    typeof raw === 'string'
      ? raw.startsWith('Bearer ')
        ? raw
        : `Bearer ${raw}`
      : '';
  const request = new Request('http://internal.local/graphql', {
    headers: header ? { Authorization: header } : {},
  });
  return createAppContext(request);
}

export function getUserId(ctx: AppContext): string | null {
  return ctx.user?.id ?? null;
}
