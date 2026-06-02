const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/graphql';

export function getGraphqlWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) return explicit;
  return API_URL.replace(/^http/, 'ws');
}
