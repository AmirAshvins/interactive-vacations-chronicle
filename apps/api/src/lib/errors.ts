import { GraphQLError } from 'graphql';

export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) return error;
  if (error instanceof AppError) {
    return new GraphQLError(error.message, {
      extensions: { code: error.code },
    });
  }
  console.error(error);
  return new GraphQLError('Internal server error', {
    extensions: { code: 'INTERNAL' },
  });
}

export function requireAuth(userId: string | null | undefined): asserts userId is string {
  if (!userId) {
    throw new AppError('Authentication required', 'UNAUTHENTICATED', 401);
  }
}

export function forbidden(message = 'Forbidden'): never {
  throw new AppError(message, 'FORBIDDEN', 403);
}

export function notFound(message = 'Not found'): never {
  throw new AppError(message, 'NOT_FOUND', 404);
}

export function conflict(message: string): never {
  throw new AppError(message, 'CONFLICT', 409);
}
