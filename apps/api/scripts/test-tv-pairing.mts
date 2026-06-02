#!/usr/bin/env tsx
import 'dotenv/config';

const API = process.env.API_URL ?? 'http://localhost:4000/graphql';
const email = `tv-${Date.now()}@example.com`;
const password = 'test-password-12';

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

async function main() {
  const { createTvSession } = await gql<{
    createTvSession: { id: string; pairingCode: string; claimed: boolean };
  }>(`mutation { createTvSession { id pairingCode claimed } }`);

  const { signUp } = await gql<{ signUp: { accessToken: string } }>(
    `mutation($email: String!, $password: String!) {
      signUp(email: $email, password: $password) { accessToken }
    }`,
    { email, password },
  );

  const { createTravelogue } = await gql<{ createTravelogue: { id: string } }>(
    `mutation { createTravelogue(name: "TV Test") { id } }`,
    undefined,
    signUp.accessToken,
  );

  const { claimTvSession } = await gql<{
    claimTvSession: { claimed: boolean; travelogueId: string; deviceToken: string };
  }>(
    `mutation($code: String!, $tid: ID!) {
      claimTvSession(code: $code, travelogueId: $tid) {
        claimed travelogueId deviceToken
      }
    }`,
    { code: createTvSession.pairingCode, tid: createTravelogue.id },
    signUp.accessToken,
  );

  if (!claimTvSession.deviceToken) throw new Error('Missing deviceToken');

  const { travelogue } = await gql<{ travelogue: { name: string } }>(
    `query($id: ID!) { travelogue(id: $id) { name } }`,
    { id: createTravelogue.id },
    claimTvSession.deviceToken,
  );

  console.log('✅ TV pairing OK — travelogue:', travelogue.name);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
