#!/usr/bin/env tsx
/**
 * Verifies pushChanges + syncDelta round-trip.
 * Usage: API running + yarn workspace @ivc/api test:push
 */
import 'dotenv/config';

const API = process.env.API_URL ?? 'http://localhost:4000/graphql';
const email = `push-${Date.now()}@example.com`;
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

  const { createTravelogue } = await gql<{ createTravelogue: { id: string; version: number } }>(
    `mutation($name: String!) { createTravelogue(name: $name) { id version } }`,
    { name: 'Push Test' },
    token,
  );
  const travelogueId = createTravelogue.id;
  const v0 = createTravelogue.version;

  const { pushChanges } = await gql<{
    pushChanges: { travelogueVersion: number; patches: { op: string }[]; conflicts: number };
  }>(
    `mutation($tid: ID!, $changes: [ChangeInput!]!) {
      pushChanges(travelogueId: $tid, changes: $changes) {
        travelogueVersion
        conflicts
        patches { op tripId }
      }
    }`,
    {
      tid: travelogueId,
      changes: [
        {
          clientMutationId: 'push-create-1',
          type: 'CREATE_TRIP',
          payload: JSON.stringify({
            clientTripId: 'client-trip-1',
            input: {
              countryCode: 'jp',
              name: 'Tokyo',
              lat: 35.68,
              lng: 139.69,
              description: 'Offline push test',
              material: 'brass',
            },
          }),
        },
      ],
    },
    token,
  );

  if (!pushChanges.patches.some((p) => p.op === 'UPDATED')) {
    throw new Error('Expected UPDATED patch after pushChanges');
  }

  const { syncDelta } = await gql<{
    syncDelta: { travelogueVersion: number; patches: unknown[] };
  }>(
    `query($tid: ID!, $since: Int!) {
      syncDelta(travelogueId: $tid, sinceVersion: $since) {
        travelogueVersion
        patches { op }
      }
    }`,
    { tid: travelogueId, since: pushChanges.travelogueVersion },
    token,
  );

  if (syncDelta.patches.length !== 0) {
    throw new Error('Expected empty syncDelta at current version');
  }

  const { syncDelta: catchUp } = await gql<{
    syncDelta: { patches: { op: string }[] };
  }>(
    `query($tid: ID!, $since: Int!) {
      syncDelta(travelogueId: $tid, sinceVersion: $since) { patches { op } }
    }`,
    { tid: travelogueId, since: v0 },
    token,
  );

  if (!catchUp.patches.length) {
    throw new Error('Expected patches when sinceVersion is stale');
  }

  console.log('✅ pushChanges + syncDelta OK');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
