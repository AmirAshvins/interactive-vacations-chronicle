import type { ChronicleExport } from '../../types/travelogue';
import { bedroodAziziTemplate } from './bedroodAzizi';

export interface ChronicleTemplate {
  /** Code users enter — matched case-insensitively */
  code: string;
  slug: string;
  title: string;
  description: string;
  export: ChronicleExport;
}

/** Bundled chronicle templates — codes are private; not listed in the UI */
export const CHRONICLE_TEMPLATES: ChronicleTemplate[] = [
  {
    code: 'Bedrood Azizi',
    slug: 'bedrood-azizi',
    title: 'Bedrood Azizi Family Chronicle',
    description: 'Tehran, Toronto & Vancouver — three chapters of the family journey.',
    export: bedroodAziziTemplate,
  },
];

export function normalizeTemplateCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findChronicleTemplateByCode(raw: string): ChronicleTemplate | null {
  const normalized = normalizeTemplateCode(raw);
  if (!normalized) return null;
  return CHRONICLE_TEMPLATES.find((t) => normalizeTemplateCode(t.code) === normalized) ?? null;
}
