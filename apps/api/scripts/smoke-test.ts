#!/usr/bin/env tsx
/**
 * Phase 1 smoke test: signUp → createTravelogue → createTrip → travelogue query
 * Usage: yarn workspace @ivc/api test:smoke
 * Requires: DATABASE_URL + running API (or run inline — this hits DB + HTTP)
 */
import 'dotenv/config';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/graphql';
const email = `test-${Date.now()}@example.com`;
const password = 'test-password-12';

async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) throw new Error('No data in GraphQL response');
  return json.data;
}

async function main() {
  console.log('1. signUp');
  const signUp = await gql<{
    signUp: { accessToken: string; user: { id: string; email: string } };
  }>(
    `mutation($email: String!, $password: String!) {
      signUp(email: $email, password: $password) {
        accessToken
        user { id email }
      }
    }`,
    { email, password },
  );
  const token = signUp.signUp.accessToken;
  console.log('   user:', signUp.signUp.user.email);

  console.log('2. createTravelogue');
  const created = await gql<{
    createTravelogue: { id: string; name: string };
  }>(
    `mutation($name: String!) {
      createTravelogue(name: $name) { id name tripCount }
    }`,
    { name: 'Smoke Test Chronicle' },
    token,
  );
  const travelogueId = created.createTravelogue.id;
  console.log('   travelogue:', travelogueId);

  console.log('3. createTrip');
  const trip = await gql<{
    createTrip: { id: string; name: string; version: number };
  }>(
    `mutation($travelogueId: ID!, $input: TripInput!) {
      createTrip(
        travelogueId: $travelogueId
        input: $input
        clientMutationId: "smoke-1"
      ) { id name version countryCode }
    }`,
    {
      travelogueId,
      input: {
        countryCode: 'CA',
        cityKey: 'toronto',
        name: 'Toronto',
        lat: 43.65,
        lng: -79.38,
        description: 'Smoke test trip',
        material: 'brass',
      },
    },
    token,
  );
  console.log('   trip:', trip.createTrip.name, `(v${trip.createTrip.version})`);

  console.log('4. travelogue query');
  const loaded = await gql<{
    travelogue: { name: string; trips: { name: string }[] };
  }>(
    `query($id: ID!) {
      travelogue(id: $id) { name trips { name } }
    }`,
    { id: travelogueId },
    token,
  );
  console.log('   trips:', loaded.travelogue.trips.map((t) => t.name).join(', '));

  console.log('\n✅ Phase 1 smoke test passed');
}

main().catch((err) => {
  console.error('\n❌ Smoke test failed:', err);
  process.exit(1);
});
