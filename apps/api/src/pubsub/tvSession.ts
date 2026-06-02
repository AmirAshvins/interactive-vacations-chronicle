import { createPubSub } from '@graphql-yoga/subscription';

export type TvSessionPayload = {
  id: string;
  pairingCode: string;
  pairingUrl: string;
  expiresAt: string;
  claimed: boolean;
  travelogueId: string | null;
  displayLabel: string | null;
  deviceToken?: string | null;
};

export const tvSessionPubSub = createPubSub<{
  'tv-session-updated': [sessionId: string, payload: TvSessionPayload];
}>();
