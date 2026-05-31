const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

const CITY_TO_COUNTRY: Record<string, string> = {
  vancouver: 'ca',
  toronto: 'ca',
  tehran: 'ir',
};

export function cityKeyToCountry(cityKey: string): string {
  return CITY_TO_COUNTRY[cityKey.toLowerCase()] ?? cityKey.slice(0, 2).toLowerCase();
}

export function normalizeCountryCode(id: string): string {
  return id.toLowerCase();
}

export function getCountryName(code: string): string {
  const id = normalizeCountryCode(code);

  if (id.startsWith('_')) {
    return id
      .slice(1)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (id.length === 2 && regionNames) {
    try {
      const name = regionNames.of(id.toUpperCase());
      if (name) return name;
    } catch {
      /* fall through */
    }
  }

  return id.toUpperCase();
}

export function formatTripDuration(trip: {
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}): string | null {
  const { startYear, startMonth, endYear, endMonth } = trip;
  if (!startYear && !endYear) return null;

  const fmt = (year?: number, month?: number) => {
    if (!year) return '';
    if (!month) return `${year}`;
    const label = new Date(year, month - 1, 1).toLocaleString('en', { month: 'short' });
    return `${label} ${year}`;
  };

  const start = fmt(startYear, startMonth);
  const end = fmt(endYear ?? startYear, endMonth);

  if (start && end && start !== end) return `${start} — ${end}`;
  return start || end || null;
}

export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString('en', { month: 'long' }),
}));
