import { describe, expect, it } from 'vitest';
import { GraphQLError } from 'graphql';
import { AppError, requireAuth, toGraphQLError } from './errors.js';

describe('errors', () => {
  it('maps AppError to GraphQL extensions', () => {
    const error = toGraphQLError(new AppError('Nope', 'BAD_REQUEST', 400));
    expect(error).toBeInstanceOf(GraphQLError);
    expect(error.extensions?.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Nope');
  });

  it('requires auth for protected operations', () => {
    expect(() => requireAuth(null)).toThrow(AppError);
    expect(() => requireAuth(undefined)).toThrow(/Authentication required/);
    expect(requireAuth('user-1')).toBeUndefined();
  });
});
