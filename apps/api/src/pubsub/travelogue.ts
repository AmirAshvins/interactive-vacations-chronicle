import { createPubSub } from '@graphql-yoga/subscription';

export type TripPatchPayload = {
  op: 'CREATED' | 'UPDATED' | 'DELETED';
  tripId: string;
  version: number;
  trip?: {
    id: string;
    countryCode: string;
    cityKey: string | null;
    name: string;
    lat: number;
    lng: number;
    description: string;
    material: 'brass' | 'copper';
    startYear: number | null;
    startMonth: number | null;
    endYear: number | null;
    endMonth: number | null;
    version: number;
    imageUrls: string[];
    updatedAt: string;
  };
};

export const traveloguePubSub = createPubSub<{
  'travelogue-updated': [travelogueId: string, payload: TripPatchPayload];
}>();
