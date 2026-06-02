import type { ChronicleExport } from '../../types/travelogue';
import { buildBedroodAziziTrips } from './buildBedroodAziziTemplate';

/** Bundled family chronicle — import with code "Bedrood Azizi". */
export const bedroodAziziTemplate: ChronicleExport = {
  version: 1,
  exportedAt: '2026-05-29T00:00:00.000Z',
  trips: buildBedroodAziziTrips(),
};
