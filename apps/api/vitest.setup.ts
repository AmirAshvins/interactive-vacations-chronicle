/** Minimal env for modules that import `env.ts` at load time. */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://ivc:ivc_dev@localhost:5432/ivc_dev';
process.env.SESSION_SECRET ??= 'test-session-secret-32-chars-min!!';
process.env.JWT_SECRET ??= 'test-jwt-secret-32-characters-min!!';
