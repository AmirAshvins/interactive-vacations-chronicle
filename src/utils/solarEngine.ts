export interface CityConfig {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  timezone: string;
}

export const CITIES: Record<string, CityConfig> = {
  toronto: {
    name: 'toronto',
    displayName: 'Toronto, CA',
    lat: 43.6532,
    lng: -79.3832,
    timezone: 'America/Toronto',
  },
  vancouver: {
    name: 'vancouver',
    displayName: 'Vancouver, CA',
    lat: 49.2827,
    lng: -123.1207,
    timezone: 'America/Vancouver',
  },
  tehran: {
    name: 'tehran',
    displayName: 'Tehran, IR',
    lat: 35.6892,
    lng: 51.3890,
    timezone: 'Asia/Tehran',
  },
};

export interface SolarTimes {
  sunrise: number;
  sunset: number;
  solarNoon: number;
  dayLength: number;
}

export interface SolarState {
  phase: 'dawn' | 'midday' | 'goldenHour' | 'twilight' | 'night';
  phaseLabel: string;
  bgGradient: string;
  shadowOffset: { dx: number; dy: number };
  shadowBlur: number;
  shadowOpacity: number;
  spotlightOpacity: number;
  autoMaterial: 'oak' | 'cork' | 'walnut';
  textColor: string;
  gridOpacity: number;
  glowColor: string;
}

/** Decimal hours (0–24) for a Date in a specific IANA timezone */
export function getDecimalHoursInTimezone(date: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const second = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);
  return hour + minute / 60 + second / 3600;
}

/** UTC offset in hours for a timezone at a given instant */
export function getTimezoneOffsetHours(timezone: string, date: Date = new Date()): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: timezone });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 3_600_000;
}

export function calculateSolarTimesMath(city: CityConfig, date: Date = new Date()): SolarTimes {
  const latitude = city.lat;
  const longitude = city.lng;

  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);

  const phi = (latitude * Math.PI) / 180;
  const declination = 23.45 * (Math.PI / 180) * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);

  const cosH = -Math.tan(phi) * Math.tan(declination);

  let dayLength = 12.0;
  if (cosH >= 1) {
    dayLength = 0;
  } else if (cosH <= -1) {
    dayLength = 24;
  } else {
    const H = Math.acos(cosH);
    dayLength = (2 * H * 24) / (2 * Math.PI);
  }

  const tzOffset = getTimezoneOffsetHours(city.timezone, date);

  const b = (2 * Math.PI * (dayOfYear - 81)) / 365;
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  const stdMeridian = tzOffset * 15;
  const longitudeCorrection = (longitude - stdMeridian) * 4;

  const noonMinutes = 12 * 60 - eot - longitudeCorrection;
  const solarNoon = noonMinutes / 60;

  const sunrise = solarNoon - dayLength / 2;
  const sunset = solarNoon + dayLength / 2;

  return {
    sunrise: Math.max(0, Math.min(24, sunrise)),
    sunset: Math.max(0, Math.min(24, sunset)),
    solarNoon: Math.max(0, Math.min(24, solarNoon)),
    dayLength,
  };
}

export async function fetchSolarTimes(city: CityConfig, date: Date = new Date()): Promise<SolarTimes> {
  const formattedDate = date.toISOString().split('T')[0];
  const url = `https://api.sunrise-sunset.org/json?lat=${city.lat}&lng=${city.lng}&date=${formattedDate}&formatted=0`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Response not ok');

    const data = await response.json();
    if (data.status !== 'OK') throw new Error('API Status not OK');

    const results = data.results;
    const toLocal = (iso: string) => getDecimalHoursInTimezone(new Date(iso), city.timezone);

    return {
      sunrise: toLocal(results.sunrise),
      sunset: toLocal(results.sunset),
      solarNoon: toLocal(results.solar_noon),
      dayLength: results.day_length / 3600,
    };
  } catch (error) {
    console.warn(`[SolarEngine] API fallback for ${city.displayName}:`, error);
    return calculateSolarTimesMath(city, date);
  }
}

export function getSolarState(decimalHour: number, times: SolarTimes, baseMaterial: 'oak' | 'cork' | 'walnut' = 'cork'): SolarState {
  const { sunrise, sunset } = times;
  const blendWindow = 1.0;

  let phase: SolarState['phase'] = 'night';
  let phaseLabel = 'Night Gallery';

  let bgGradient = '#141414';
  let shadowOffset = { dx: 0, dy: 6 };
  let shadowBlur = 16;
  let shadowOpacity = 0.28;
  let spotlightOpacity = 0.45;
  let autoMaterial: 'oak' | 'cork' | 'walnut' = 'walnut';
  let textColor = 'rgba(255, 255, 255, 0.4)';
  let gridOpacity = 0.02;
  let glowColor = 'rgba(229, 192, 123, 0.2)';

  if (decimalHour >= sunrise - blendWindow && decimalHour < sunrise + blendWindow) {
    phase = 'dawn';
    phaseLabel = 'Sunrise Horizon';
    autoMaterial = baseMaterial === 'walnut' ? 'oak' : baseMaterial;
    textColor = 'rgba(28, 28, 30, 0.5)';
    gridOpacity = 0.04;
    glowColor = 'rgba(252, 234, 222, 0.4)';
    spotlightOpacity = 0.0;
    const progress = (decimalHour - (sunrise - blendWindow)) / (blendWindow * 2);
    bgGradient = '#ffffff';
    shadowOffset = { dx: -16 + progress * 10, dy: 12 - progress * 7 };
    shadowBlur = 18 - progress * 8;
    shadowOpacity = 0.07 + progress * 0.06;
  } else if (decimalHour >= sunrise + blendWindow && decimalHour < sunset - blendWindow * 1.5) {
    phase = 'midday';
    phaseLabel = 'Daylight Plaster';
    autoMaterial = baseMaterial === 'walnut' ? 'cork' : baseMaterial;
    textColor = 'rgba(28, 28, 30, 0.6)';
    gridOpacity = 0.03;
    glowColor = 'rgba(255, 255, 255, 0.3)';
    spotlightOpacity = 0.0;
    const progress =
      (decimalHour - (sunrise + blendWindow)) /
      (sunset - blendWindow * 1.5 - (sunrise + blendWindow));
    bgGradient = '#ffffff';
    shadowOffset = { dx: -6 + progress * 12, dy: 3 + Math.abs(progress - 0.5) * 4 };
    shadowBlur = 6 + Math.abs(progress - 0.5) * 8;
    shadowOpacity = 0.14 - Math.abs(progress - 0.5) * 0.04;
  } else if (decimalHour >= sunset - blendWindow * 1.5 && decimalHour < sunset) {
    phase = 'goldenHour';
    phaseLabel = 'Golden Hour Study';
    autoMaterial = baseMaterial === 'walnut' ? 'cork' : baseMaterial;
    textColor = 'rgba(28, 28, 30, 0.55)';
    gridOpacity = 0.04;
    glowColor = 'rgba(253, 244, 227, 0.5)';
    spotlightOpacity = 0.0;
    const progress = (decimalHour - (sunset - blendWindow * 1.5)) / (blendWindow * 1.5);
    bgGradient = '#ffffff';
    shadowOffset = { dx: 6 + progress * 10, dy: 7 + progress * 5 };
    shadowBlur = 10 + progress * 8;
    shadowOpacity = 0.12 - progress * 0.03;
  } else if (decimalHour >= sunset && decimalHour < sunset + blendWindow) {
    phase = 'twilight';
    phaseLabel = 'Twilight Gallery';
    autoMaterial = baseMaterial === 'walnut' ? 'oak' : baseMaterial;
    textColor = 'rgba(255, 255, 255, 0.4)';
    gridOpacity = 0.03;
    glowColor = 'rgba(182, 192, 222, 0.3)';
    const progress = (decimalHour - sunset) / blendWindow;
    bgGradient = interpolateColor('#ffffff', '#141414', progress);
    shadowOffset = { dx: 16 - progress * 10, dy: 12 - progress * 6 };
    shadowBlur = 18 + progress * 8;
    shadowOpacity = 0.09 + progress * 0.12;
    spotlightOpacity = progress * 0.3;
  } else {
    phase = 'night';
    phaseLabel = 'Midnight Gallery';
    autoMaterial = 'walnut';
    textColor = 'rgba(255, 255, 255, 0.35)';
    gridOpacity = 0.025;
    glowColor = 'rgba(212, 175, 55, 0.25)';
    spotlightOpacity = 0.45;
    bgGradient = '#141414';
    shadowOffset = { dx: 0, dy: 6 };
    shadowBlur = 20;
    shadowOpacity = 0.26;
  }

  return {
    phase,
    phaseLabel,
    bgGradient,
    shadowOffset,
    shadowBlur,
    shadowOpacity,
    spotlightOpacity,
    autoMaterial,
    textColor,
    gridOpacity,
    glowColor,
  };
}

function interpolateColor(color1: string, color2: string, factor: number): string {
  const r1 = parseInt(color1.substring(1, 3), 16);
  const g1 = parseInt(color1.substring(3, 5), 16);
  const b1 = parseInt(color1.substring(5, 7), 16);
  const r2 = parseInt(color2.substring(1, 3), 16);
  const g2 = parseInt(color2.substring(3, 5), 16);
  const b2 = parseInt(color2.substring(5, 7), 16);
  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));
  const toHex = (c: number) => (c.toString(16).length === 1 ? '0' + c.toString(16) : c.toString(16));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
