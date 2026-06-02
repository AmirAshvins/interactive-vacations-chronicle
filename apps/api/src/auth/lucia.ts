import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '../db/index.js';
import { sessions, users } from '../db/schema.js';
import { env } from '../env.js';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    name: env.SESSION_COOKIE_NAME,
    expires: false,
    attributes: {
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email,
    displayName: attributes.displayName,
  }),
});

import type { Session, User } from 'lucia';

export type AuthSession = Session;
export type AuthUser = User;

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      displayName: string | null;
    };
  }
}
