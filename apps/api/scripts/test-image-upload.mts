#!/usr/bin/env tsx
/**
 * End-to-end image upload: requestImageUpload → PUT → attachImage.
 * Usage: API running + yarn workspace @ivc/api test:image
 */
import 'dotenv/config';

const API = process.env.API_URL ?? 'http://localhost:4000/graphql';
const email = `img-${Date.now()}@example.com`;
const password = 'test-password-12';

/** Minimal valid JPEG (1x1) */
const JPEG_BYTES = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
  'base64',
);

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
  const health = await fetch(API.replace('/graphql', '/health'));
  const healthJson = (await health.json()) as { storage?: string };
  console.log('Storage mode:', healthJson.storage ?? 'unknown');

  const { signUp } = await gql<{ signUp: { accessToken: string } }>(
    `mutation($email: String!, $password: String!) {
      signUp(email: $email, password: $password) { accessToken }
    }`,
    { email, password },
  );
  const token = signUp.accessToken;

  const { createTravelogue } = await gql<{ createTravelogue: { id: string } }>(
    `mutation($name: String!) { createTravelogue(name: $name) { id } }`,
    { name: 'Image Test' },
    token,
  );

  const { createTrip } = await gql<{ createTrip: { id: string } }>(
    `mutation($tid: ID!, $input: TripInput!) {
      createTrip(travelogueId: $tid, input: $input, clientMutationId: "img-trip") {
        id
      }
    }`,
    {
      tid: createTravelogue.id,
      input: {
        countryCode: 'IT',
        name: 'Rome',
        lat: 41.9,
        lng: 12.5,
        description: 'Image upload test',
        material: 'brass',
      },
    },
    token,
  );
  const tripId = createTrip.id;

  const { requestImageUpload } = await gql<{
    requestImageUpload: { imageId: string; uploadUrl: string; publicUrl: string };
  }>(
    `mutation($tripId: ID!, $mime: String!, $size: Int!) {
      requestImageUpload(tripId: $tripId, mimeType: $mime, sizeBytes: $size) {
        imageId uploadUrl publicUrl
      }
    }`,
    { tripId, mime: 'image/jpeg', size: JPEG_BYTES.length },
    token,
  );

  const putRes = await fetch(requestImageUpload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: JPEG_BYTES,
  });
  if (!putRes.ok) throw new Error(`PUT failed: ${putRes.status}`);

  const { attachImage } = await gql<{ attachImage: { imageUrls: string[] } }>(
    `mutation($tripId: ID!, $imageId: ID!) {
      attachImage(tripId: $tripId, imageId: $imageId, clientMutationId: "img-attach") {
        imageUrls
      }
    }`,
    { tripId, imageId: requestImageUpload.imageId },
    token,
  );

  if (!attachImage.imageUrls.length) {
    throw new Error('attachImage returned no imageUrls');
  }

  const mediaRes = await fetch(attachImage.imageUrls[0]);
  if (!mediaRes.ok) throw new Error(`CDN/media GET failed: ${mediaRes.status}`);

  console.log('✅ Image upload pipeline OK');
  console.log('   publicUrl:', attachImage.imageUrls[0]);
}

main().catch((e) => {
  console.error('❌', e);
  process.exit(1);
});
