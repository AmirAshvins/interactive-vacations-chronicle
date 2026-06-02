import type { useAppSettings } from '../hooks/useAppSettings';
import TravelogueView from '../views/TravelogueView';

/** Offline-only chronicle using IndexedDB on this device. */
export default function GuestPage({
  appSettings,
}: {
  appSettings: ReturnType<typeof useAppSettings>;
}) {
  return <TravelogueView mode="local" appSettings={appSettings} />;
}
