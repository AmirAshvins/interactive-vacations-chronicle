import { eq } from 'drizzle-orm';
import { lucia } from '../auth/lucia.js';
import { createAccessToken } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { users } from '../db/schema.js';
import { env } from '../env.js';
import type { AppContext } from '../context.js';
import { AppError } from '../lib/errors.js';
import { sendVerificationEmail } from './email.js';

export async function signUp(
  ctx: AppContext,
  email: string,
  password: string,
  displayName?: string | null,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);
  if (existing) throw new AppError('Email already registered', 'EMAIL_TAKEN', 409);

  const passwordHash = await hashPassword(password);
  const [user] = await ctx.db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      displayName: displayName?.trim() || null,
    })
    .returning();

  if (!user) throw new AppError('Failed to create user', 'INTERNAL', 500);

  const verifyUrl = `${env.PUBLIC_APP_ORIGIN}/verify?email=${encodeURIComponent(normalizedEmail)}`;
  void sendVerificationEmail(normalizedEmail, verifyUrl);

  return createAuthPayload(ctx, user.id, user.email, user.displayName);
}

export async function signIn(ctx: AppContext, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [user] = await ctx.db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user?.passwordHash) throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);

  return createAuthPayload(ctx, user.id, user.email, user.displayName);
}

export async function signOut(ctx: AppContext) {
  if (ctx.session) {
    await lucia.invalidateSession(ctx.session.id);
    ctx.pendingSetCookies.push(lucia.createBlankSessionCookie().serialize());
  }
  return true;
}

export async function refreshAccessToken(ctx: AppContext) {
  if (!ctx.session || !ctx.user) {
    throw new AppError('Authentication required', 'UNAUTHENTICATED', 401);
  }
  return createAuthPayload(ctx, ctx.user.id, ctx.user.email, ctx.user.displayName);
}

async function createAuthPayload(
  ctx: AppContext,
  userId: string,
  email: string,
  displayName: string | null,
) {
  const session = await lucia.createSession(userId, {});
  ctx.pendingSetCookies.push(lucia.createSessionCookie(session.id).serialize());
  const accessToken = await createAccessToken(userId, session.id);

  return {
    user: { id: userId, email, displayName },
    accessToken,
    expiresIn: env.JWT_ACCESS_TTL_SECONDS,
  };
}
