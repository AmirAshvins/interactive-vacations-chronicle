import { useCallback, useRef, useState } from 'react';

const ACTIVATION_PX = 8;
const DEFAULT_DISMISS_PX = 96;
const EXPAND_THRESHOLD_PX = 48;

export type BottomSheetSnap = 'peek' | 'expanded';

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
  const [snap, setSnap] = useState<BottomSheetSnap>('peek');
  const offsetYRef = useRef(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startSnapRef = useRef<BottomSheetSnap>('peek');
  const activeRef = useRef(false);
  const capturedRef = useRef(false);

  const reset = useCallback(() => {
    activeRef.current = false;
    capturedRef.current = false;
    setIsDragging(false);
    offsetYRef.current = 0;
    setOffsetY(0);
    setSnap('peek');
    startSnapRef.current = 'peek';
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startSnapRef.current = snap;
      activeRef.current = true;
      capturedRef.current = false;
    },
    [enabled, snap],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !activeRef.current) return;

      const dx = e.clientX - startXRef.current;
      const dy = e.clientY - startYRef.current;

      if (!capturedRef.current) {
        if (Math.abs(dy) <= ACTIVATION_PX && Math.abs(dx) <= ACTIVATION_PX) return;
        if (Math.abs(dy) <= Math.abs(dx)) return;
        capturedRef.current = true;
        setIsDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }

      // Allow upward drag (negative dy) from peek position — shows partial expand preview.
      // Clamp: can't drag below 0 (already at bottom of content), can't drag up past -80px.
      const next = startSnapRef.current === 'expanded'
        ? Math.max(0, dy)   // from expanded: only downward drag
        : Math.max(-80, dy); // from peek: allow a little upward drag for preview
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

        const dy = e.clientY - startYRef.current;
        const draggingDown = dy > 0;
        const draggingUp = dy < 0;

        if (startSnapRef.current === 'expanded') {
          if (draggingDown && offsetYRef.current >= dismissThresholdPx) {
            onDismiss();
          } else if (draggingDown && offsetYRef.current >= EXPAND_THRESHOLD_PX) {
            setSnap('peek');
          } else {
            setSnap('expanded');
          }
        } else {
          // Starting from peek
          if (draggingUp && Math.abs(dy) >= EXPAND_THRESHOLD_PX) {
            setSnap('expanded');
          } else if (draggingDown && offsetYRef.current >= dismissThresholdPx) {
            onDismiss();
          } else {
            setSnap('peek');
          }
        }
      }

      offsetYRef.current = 0;
      setOffsetY(0);
      setIsDragging(false);
      capturedRef.current = false;
    },
    [enabled, dismissThresholdPx, onDismiss],
  );

  return {
    offsetY,
    isDragging,
    snap,
    setSnap,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    reset,
  };
}
