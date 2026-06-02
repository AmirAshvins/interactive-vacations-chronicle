import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

interface PanelChromeContextValue {
  registerExpandSheet: (fn: (() => void) | null) => void;
  expandPanelSheet: () => void;
}

const PanelChromeContext = createContext<PanelChromeContextValue | null>(null);

export function PanelChromeProvider({ children }: { children: ReactNode }) {
  const expandRef = useRef<(() => void) | null>(null);

  const registerExpandSheet = useCallback((fn: (() => void) | null) => {
    expandRef.current = fn;
  }, []);

  const expandPanelSheet = useCallback(() => {
    expandRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ registerExpandSheet, expandPanelSheet }),
    [registerExpandSheet, expandPanelSheet],
  );

  return <PanelChromeContext.Provider value={value}>{children}</PanelChromeContext.Provider>;
}

export function usePanelChrome(): PanelChromeContextValue {
  const ctx = useContext(PanelChromeContext);
  if (!ctx) {
    return {
      registerExpandSheet: () => {},
      expandPanelSheet: () => {},
    };
  }
  return ctx;
}
