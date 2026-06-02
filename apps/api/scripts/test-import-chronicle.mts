#!/usr/bin/env tsx
import 'dotenv/config';

const API = process.env.API_URL ?? 'http://localhost:4000/graphql';
const email = `import-${Date.now()}@example.com`;
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

const sampleJson = JSON.stringify({
  version: 1,
  trips: [
    {
      id: 'import-trip-1',
      countryCode: 'fr',
      name: 'Paris',
      lat: 48.8566,
      lng: 2.3522,
      description: 'From smoke test',
      material: 'brass',
    },
  ],
});

async function main() {
  const { signUp } = await gql<{ signUp: { accessToken: string } }>(
    `mutation($email: String!, $password: String!) {
      signUp(email: $email, password: $password) { accessToken }
    }`,
    { email, password },
  );

  const { createTravelogue } = await gql<{ createTravelogue: { id: string } }>(
    `mutation { createTravelogue(name: "Import Test") { id } }`,
    undefined,
    signUp.accessToken,
  );

  const { importChronicle } = await gql<{
    importChronicle: { trips: { name: string }[] };
  }>(
    `mutation($tid: ID!, $json: String!, $mode: ImportMode!) {
      importChronicle(travelogueId: $tid, json: $json, mode: $mode) {
        trips { name }
      }
    }`,
    { tid: createTravelogue.id, json: sampleJson, mode: 'MERGE' },
    signUp.accessToken,
  );

  if (importChronicle.trips.length !== 1 || importChronicle.trips[0].name !== 'Paris') {
    throw new Error('Unexpected import result');
  }

  const { importChronicle: replaced } = await gql<{
    importChronicle: { trips: { name: string }[] };
  }>(
    `mutation($tid: ID!, $json: String!, $mode: ImportMode!) {
      importChronicle(travelogueId: $tid, json: $json, mode: $mode) {
        trips { name }
      }
    }`,
    {
      tid: createTravelogue.id,
      json: JSON.stringify({
        version: 1,
        trips: [
          {
            id: 'import-trip-2',
            countryCode: 'jp',
            name: 'Tokyo',
            lat: 35.6762,
            lng: 139.6503,
            description: 'Replace mode',
            material: 'copper',
          },
        ],
      }),
      mode: 'REPLACE',
    },
    signUp.accessToken,
  );

  if (replaced.trips.length !== 1 || replaced.trips[0].name !== 'Tokyo') {
    throw new Error('REPLACE import failed');
  }

  console.log('✅ importChronicle MERGE + REPLACE OK');
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
