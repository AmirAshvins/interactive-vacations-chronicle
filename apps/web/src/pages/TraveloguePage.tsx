import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { useAppSettings } from '../hooks/useAppSettings';
import TravelogueView from '../views/TravelogueView';

export default function TraveloguePage({
  appSettings,
}: {
  appSettings: ReturnType<typeof useAppSettings>;
}) {
  const { travelogueId } = useParams<{ travelogueId: string }>();
  const { user, ready, accessToken } = useAuth();

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f0e8]">
        <p className="text-xs font-light uppercase tracking-[0.3em] opacity-50">Loading…</p>
      </div>
    );
  }

  if (!user || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!travelogueId) {
    return <Navigate to="/travelogues" replace />;
  }

  return (
    <TravelogueView mode="synced" travelogueId={travelogueId} appSettings={appSettings} />
  );
}
