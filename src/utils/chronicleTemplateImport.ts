import { findChronicleTemplateByCode, type ChronicleTemplate } from '../data/chronicleTemplates';
import { parseChronicleImport, type ImportTrip } from './chronicleTransfer';

export interface TemplateImportResult {
  trips: ImportTrip[];
  template: ChronicleTemplate;
}

async function tripsFromTemplate(template: ChronicleTemplate): Promise<ImportTrip[]> {
  return parseChronicleImport(template.export);
}

export async function importTripsFromTemplateCode(code: string): Promise<TemplateImportResult> {
  const template = findChronicleTemplateByCode(code);
  if (!template) {
    throw new Error(`No chronicle template matches "${code.trim()}".`);
  }
  const trips = await tripsFromTemplate(template);
  return { trips, template };
}
