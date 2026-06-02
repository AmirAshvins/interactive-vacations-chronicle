const TV_SESSION_KEY = 'ivc-tv-session';
const PHONE_PAIR_HINT_KEY = 'ivc-phone-tv-hint';

export interface StoredTvSession {
  sessionId: string;
  deviceToken: string;
  travelogueId: string;
  displayLabel?: string | null;
}

export interface PhonePairHint {
  travelogueId: string;
  displayLabel?: string | null;
  pairedAt: string;
}

export function loadTvSession(): StoredTvSession | null {
  try {
    const raw = localStorage.getItem(TV_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTvSession;
  } catch {
    return null;
  }
}

export function saveTvSession(session: StoredTvSession): void {
  localStorage.setItem(TV_SESSION_KEY, JSON.stringify(session));
}

export function clearTvSession(): void {
  localStorage.removeItem(TV_SESSION_KEY);
}

export function savePhonePairHint(hint: PhonePairHint): void {
  sessionStorage.setItem(PHONE_PAIR_HINT_KEY, JSON.stringify(hint));
}

export function loadPhonePairHint(): PhonePairHint | null {
  try {
    const raw = sessionStorage.getItem(PHONE_PAIR_HINT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PhonePairHint;
  } catch {
    return null;
  }
}

export function clearPhonePairHint(): void {
  sessionStorage.removeItem(PHONE_PAIR_HINT_KEY);
}
