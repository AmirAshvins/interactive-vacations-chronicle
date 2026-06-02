import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useEnvironment, type EnvironmentState } from '../hooks/useEnvironment';
import type { EnvironmentOverride } from '../utils/detectEnvironment';

export interface EnvironmentContextValue extends EnvironmentState {
  setTvInteractionOverride: (value: EnvironmentOverride) => void;
  setMobileLayoutOverride: (value: EnvironmentOverride) => void;
  isTvScreensaver: boolean;
  setTvScreensaver: (enabled: boolean) => void;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

interface EnvironmentProviderProps {
  children: ReactNode;
  tvInteraction: EnvironmentOverride;
  mobileLayout: EnvironmentOverride;
  isTvScreensaver: boolean;
  setTvInteraction: (value: EnvironmentOverride) => void;
  setMobileLayout: (value: EnvironmentOverride) => void;
  setTvScreensaver: (enabled: boolean) => void;
}

export function EnvironmentProvider({
  children,
  tvInteraction,
  mobileLayout,
  isTvScreensaver,
  setTvInteraction,
  setMobileLayout,
  setTvScreensaver,
}: EnvironmentProviderProps) {
  const env = useEnvironment({ tvInteraction, mobileLayout });

  const value = useMemo<EnvironmentContextValue>(
    () => ({
      ...env,
      setTvInteractionOverride: setTvInteraction,
      setMobileLayoutOverride: setMobileLayout,
      isTvScreensaver,
      setTvScreensaver,
    }),
    [env, setTvInteraction, setMobileLayout, isTvScreensaver, setTvScreensaver],
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}

export function useEnvironmentContext(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    throw new Error('useEnvironmentContext must be used within EnvironmentProvider');
  }
  return ctx;
}

/** Safe optional access for leaf components */
export function useEnvironmentOptional(): EnvironmentContextValue | null {
  return useContext(EnvironmentContext);
}
