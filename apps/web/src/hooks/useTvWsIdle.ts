import { useEffect, useState } from 'react';

const TV_WS_IDLE_MS = 30 * 60 * 1000;

/** Pauses WebSocket subscriptions after idle; resumes on user input (TV remote / keyboard). */
export function useTvWsIdle(enabled: boolean): boolean {
  const [wsActive, setWsActive] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setWsActive(true);
      return;
    }

    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setWsActive(false), TV_WS_IDLE_MS);
    };

    const wake = () => {
      setWsActive(true);
      scheduleIdle();
    };

    wake();
    const events = ['keydown', 'pointerdown'] as const;
    for (const ev of events) {
      window.addEventListener(ev, wake);
    }

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      for (const ev of events) {
        window.removeEventListener(ev, wake);
      }
    };
  }, [enabled]);

  return wsActive;
}
