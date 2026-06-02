#!/usr/bin/env tsx
/**
 * Verifies travelogueUpdated subscription delivers patches after a mutation.
 * Usage: API running + yarn workspace @ivc/api test:subscription
 */
import 'dotenv/config';
import { createClient } from 'graphql-ws';

const API = process.env.API_URL ?? 'http://localhost:4000/graphql';
const WS_URL = API.replace(/^http/, 'ws');
const email = `sub-${Date.now()}@example.com`;
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
  const { signUp } = await gql<{ signUp: { accessToken: string } }>(
    `mutation($email: String!, $password: String!) {
      signUp(email: $email, password: $password) { accessToken }
    }`,
    { email, password },
  );
  const token = signUp.accessToken;

  const { createTravelogue } = await gql<{ createTravelogue: { id: string } }>(
    `mutation($name: String!) { createTravelogue(name: $name) { id } }`,
    { name: 'Sub Test' },
    token,
  );
  const travelogueId = createTravelogue.id;

  const patchPromise = new Promise<{ op: string; tripId: string }>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 8000);
    const client = createClient({
      url: WS_URL,
      connectionParams: { Authorization: token },
    });
    const unsub = client.subscribe(
      {
        query: `subscription($id: ID!) {
          travelogueUpdated(travelogueId: $id) { op tripId version }
        }`,
        variables: { id: travelogueId },
      },
      {
        next: (msg) => {
          const patch = msg.data?.travelogueUpdated as { op: string; tripId: string } | undefined;
          if (patch?.op === 'CREATED') {
            clearTimeout(timeout);
            unsub();
            client.dispose();
            resolve(patch);
          }
        },
        error: reject,
        complete: () => {},
      },
    );
  });

  await new Promise((r) => setTimeout(r, 300));

  await gql(
    `mutation($tid: ID!, $input: TripInput!) {
      createTrip(travelogueId: $tid, input: $input, clientMutationId: "sub-test") {
        id name
      }
    }`,
    {
      tid: travelogueId,
      input: {
        countryCode: 'FR',
        name: 'Paris',
        lat: 48.85,
        lng: 2.35,
        description: 'Via subscription test',
        material: 'brass',
      },
    },
    token,
  );

  const patch = await patchPromise;
  console.log('✅ Received subscription patch:', patch);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
