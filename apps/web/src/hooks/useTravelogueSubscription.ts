import { useEffect, useRef } from 'react';
import { createClient } from 'graphql-ws';
import { TRAVELOGUE_UPDATED } from '../lib/graphql/operations';
import { type TripPatchMessage } from '../lib/graphql/applyTripPatch';
import { getGraphqlWsUrl } from '../lib/graphql/wsUrl';

export function useTravelogueSubscription(
  travelogueId: string,
  accessToken: string | null,
  onPatch: (patch: TripPatchMessage) => void,
  enabled = true,
) {
  const onPatchRef = useRef(onPatch);
  onPatchRef.current = onPatch;

  useEffect(() => {
    if (!enabled || !accessToken || !travelogueId) return;

    const client = createClient({
      url: getGraphqlWsUrl(),
      connectionParams: () => ({
        Authorization: accessToken,
      }),
      retryAttempts: 10,
      shouldRetry: () => true,
    });

    const unsubscribe = client.subscribe(
      {
        query: TRAVELOGUE_UPDATED,
        variables: { travelogueId },
      },
      {
        next: (result) => {
          const patch = result.data?.travelogueUpdated as TripPatchMessage | undefined;
          if (patch) onPatchRef.current(patch);
        },
        error: (err) => {
          console.warn('[ivc] subscription error', err);
        },
        complete: () => {},
      },
    );

    return () => {
      unsubscribe();
      client.dispose();
    };
  }, [travelogueId, accessToken, enabled]);
}
