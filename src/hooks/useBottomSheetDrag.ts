import { useCallback, useRef, useState } from 'react';

const ACTIVATION_PX = 8;
const DEFAULT_DISMISS_PX = 96;

interface UseBottomSheetDragOptions {
  enabled: boolean;
  onDismiss: () => void;
  dismissThresholdPx?: number;
}

export function useBottomSheetDrag({
  enabled,
  onDismiss,
  dismissThresholdPx = DEFAULT_DISMISS_PX,
}: UseBottomSheetDragOptions) {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const offsetYRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const activeRef = useRef(false);
  const capturedRef = useRef(false);

  const reset = useCallback(() => {
    activeRef.current = false;
    capturedRef.current = false;
    setIsDragging(false);
    offsetYRef.current = 0;
    setOffsetY(0);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      activeRef.current = true;
      capturedRef.current = false;
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !activeRef.current) return;

      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;

      if (!capturedRef.current) {
        if (dy <= ACTIVATION_PX || dy <= Math.abs(dx)) return;
        capturedRef.current = true;
        setIsDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }

      const next = Math.max(0, dy);
      offsetYRef.current = next;
      setOffsetY(next);
    },
    [enabled],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !activeRef.current) return;
      activeRef.current = false;

      if (capturedRef.current) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        if (offsetYRef.current >= dismissThresholdPx) {
          onDismiss();
        }
      }

      reset();
    },
    [enabled, dismissThresholdPx, onDismiss, reset],
  );

  return {
    offsetY,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    reset,
  };
}
