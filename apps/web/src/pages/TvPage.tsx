import { useCallback, useEffect, useState } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import TvPairingScreen, { type TvPairingSession } from '../components/TvPairingScreen';
import TravelogueView from '../views/TravelogueView';
import { gqlRequest } from '../lib/graphql/client';
import { CREATE_TV_SESSION, TV_SESSION_UPDATED, UNPAIR_TV_SESSION } from '../lib/graphql/operations';
import { createClient } from 'graphql-ws';
import { getGraphqlWsUrl } from '../lib/graphql/wsUrl';
import {
  clearTvSession,
  loadTvSession,
  saveTvSession,
  type StoredTvSession,
} from '../lib/tvSessionStorage';

export default function TvPage() {
  const appSettings = useAppSettings();
  const { setTvInteractionOverride } = useEnvironmentContext();
  const [stored, setStored] = useState<StoredTvSession | null>(() => loadTvSession());
  const [pairing, setPairing] = useState<TvPairingSession | null>(null);
  const [pairStatus, setPairStatus] = useState<'waiting' | 'claimed' | 'error'>('waiting');
  const [pairError, setPairError] = useState<string | null>(null);

  useEffect(() => {
    setTvInteractionOverride('on');
    return () => setTvInteractionOverride('auto');
  }, [setTvInteractionOverride]);

  const startPairing = useCallback(async () => {
    setPairError(null);
    setPairStatus('waiting');
    const data = await gqlRequest<{ createTvSession: TvPairingSession }>(CREATE_TV_SESSION, {
      displayLabel: 'Living room TV',
    });
    setPairing(data.createTvSession);
    return data.createTvSession;
  }, []);

  useEffect(() => {
    if (stored) return;
    void startPairing().catch((err) => {
      setPairError(err instanceof Error ? err.message : 'Could not start pairing');
      setPairStatus('error');
    });
  }, [stored, startPairing]);

  useEffect(() => {
    if (!pairing || stored) return;

    const client = createClient({ url: getGraphqlWsUrl() });

    const unsubscribe = client.subscribe(
      {
        query: TV_SESSION_UPDATED,
        variables: { sessionId: pairing.id },
      },
      {
        next: (msg) => {
          const updated = msg.data?.tvSessionUpdated as {
            claimed: boolean;
            travelogueId?: string | null;
            deviceToken?: string | null;
            displayLabel?: string | null;
          } | null;
          if (!updated?.claimed || !updated.travelogueId || !updated.deviceToken) return;

          const session: StoredTvSession = {
            sessionId: pairing.id,
            deviceToken: updated.deviceToken,
            travelogueId: updated.travelogueId,
            displayLabel: updated.displayLabel,
          };
          saveTvSession(session);
          setStored(session);
          setPairStatus('claimed');
          client.dispose();
        },
        error: () => {
          setPairError('Connection lost — refresh to get a new code');
          setPairStatus('error');
        },
        complete: () => {},
      },
    );

    return () => {
      unsubscribe();
      client.dispose();
    };
  }, [pairing, stored]);

  const handleUnpair = useCallback(async () => {
    if (stored?.deviceToken) {
      try {
        await gqlRequest(UNPAIR_TV_SESSION, {}, stored.deviceToken);
      } catch {
        /* clear locally anyway */
      }
    }
    clearTvSession();
    setStored(null);
    setPairing(null);
    await startPairing();
  }, [stored, startPairing]);

  if (stored) {
    return (
      <div className="relative h-full w-full">
        <TravelogueView
          mode="tv-display"
          travelogueId={stored.travelogueId}
          deviceToken={stored.deviceToken}
          appSettings={appSettings}
          onUnpairTv={() => void handleUnpair()}
        />
      </div>
    );
  }

  if (!pairing) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f0e8]">
        <p className="text-xs uppercase tracking-[0.3em] opacity-50">Starting pairing…</p>
      </div>
    );
  }

  return <TvPairingScreen session={pairing} status={pairStatus} errorMessage={pairError} />;
}
