import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { gqlRequest } from '../lib/graphql/client';
import { ME, SIGN_IN, SIGN_OUT, SIGN_UP } from '../lib/graphql/operations';

const TOKEN_KEY = 'ivc-access-token';
const LAST_TRAVELOGUE_KEY = 'ivc-last-travelogue-id';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface TravelogueSummary {
  id: string;
  name: string;
  role: string;
  tripCount: number;
  version: number;
  updatedAt: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  travelogues: TravelogueSummary[];
  accessToken: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setLastTravelogueId: (id: string) => void;
  lastTravelogueId: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function loadLastTravelogueId(): string | null {
  return localStorage.getItem(LAST_TRAVELOGUE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(loadToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [travelogues, setTravelogues] = useState<TravelogueSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [lastTravelogueId, setLastTravelogueIdState] = useState<string | null>(loadLastTravelogueId);

  const refreshMe = useCallback(async () => {
    const token = loadToken();
    if (!token) {
      setUser(null);
      setTravelogues([]);
      setAccessToken(null);
      return;
    }

    const data = await gqlRequest<{
      me: {
        id: string;
        email: string;
        displayName: string | null;
        travelogues: TravelogueSummary[];
      } | null;
    }>(ME, undefined, token);

    if (!data.me) {
      localStorage.removeItem(TOKEN_KEY);
      setAccessToken(null);
      setUser(null);
      setTravelogues([]);
      return;
    }

    setAccessToken(token);
    setUser({
      id: data.me.id,
      email: data.me.email,
      displayName: data.me.displayName,
    });
    setTravelogues(data.me.travelogues);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshMe()
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAccessToken(null);
        setUser(null);
        setTravelogues([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  const applyAuthPayload = useCallback(
    async (payload: {
      accessToken: string;
      user: AuthUser;
    }) => {
      localStorage.setItem(TOKEN_KEY, payload.accessToken);
      setAccessToken(payload.accessToken);
      setUser(payload.user);
      await refreshMe();
    },
    [refreshMe],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const data = await gqlRequest<{
        signIn: { accessToken: string; user: AuthUser };
      }>(SIGN_IN, { email, password });
      await applyAuthPayload(data.signIn);
    },
    [applyAuthPayload],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const data = await gqlRequest<{
        signUp: { accessToken: string; user: AuthUser };
      }>(SIGN_UP, { email, password, displayName: displayName || null });
      await applyAuthPayload(data.signUp);
    },
    [applyAuthPayload],
  );

  const signOut = useCallback(async () => {
    try {
      if (accessToken) {
        await gqlRequest(SIGN_OUT, undefined, accessToken);
      }
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    setTravelogues([]);
  }, [accessToken]);

  const setLastTravelogueId = useCallback((id: string) => {
    localStorage.setItem(LAST_TRAVELOGUE_KEY, id);
    setLastTravelogueIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      user,
      travelogues,
      accessToken,
      ready,
      signIn,
      signUp,
      signOut,
      refreshMe,
      setLastTravelogueId,
      lastTravelogueId,
    }),
    [
      user,
      travelogues,
      accessToken,
      ready,
      signIn,
      signUp,
      signOut,
      refreshMe,
      setLastTravelogueId,
      lastTravelogueId,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
