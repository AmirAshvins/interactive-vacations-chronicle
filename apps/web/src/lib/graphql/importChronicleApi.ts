import { gqlRequest } from './client';
import { buildChronicleExport } from '../../utils/chronicleTransfer';
import type { Trip } from '../../types/travelogue';
import { serverTripToTrip, type ServerTrip } from './mappers';
import { syncTripsImageCache } from './syncImageCache';
import type { ChronicleImportResolution } from '../../utils/chronicleImportResolve';

export async function importChronicleToServer(
  accessToken: string,
  travelogueId: string,
  trips: Trip[],
  resolution: ChronicleImportResolution,
): Promise<Trip[]> {
  const mode = resolution === 'replace' ? 'REPLACE' : 'MERGE';
  const json = JSON.stringify(await buildChronicleExport(trips));

  const data = await gqlRequest<{
    importChronicle: { trips: ServerTrip[] };
  }>(
    `mutation ImportChronicle($travelogueId: ID!, $json: String!, $mode: ImportMode!) {
      importChronicle(travelogueId: $travelogueId, json: $json, mode: $mode) {
        trips {
          id
          countryCode
          cityKey
          name
          lat
          lng
          description
          material
          startYear
          startMonth
          endYear
          endMonth
          version
          imageUrls
          updatedAt
        }
      }
    }`,
    { travelogueId, json, mode },
    accessToken,
  );

  await syncTripsImageCache(data.importChronicle.trips);
  return data.importChronicle.trips.map(serverTripToTrip);
}
