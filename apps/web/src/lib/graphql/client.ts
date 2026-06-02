const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql';

export class GraphqlError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'GraphqlError';
    this.code = code;
  }
}

export async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  accessToken?: string | null,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string; extensions?: { code?: string } }[];
  };

  if (json.errors?.length) {
    const first = json.errors[0];
    throw new GraphqlError(first.message, first.extensions?.code);
  }

  if (!json.data) {
    throw new GraphqlError('Empty GraphQL response');
  }

  return json.data;
}
