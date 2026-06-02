import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Trip } from '../types/travelogue';
import type { HomeOrigin } from '../utils/flightRoutes';
import { useTvFocus } from '../context/TvFocusContext';
import ChronicleLogCard, { estimateCardHeight } from './ChronicleLogCard';

interface VirtualChronicleListProps {
  trips: Trip[];
  isDarkPhase: boolean;
  flightTripIds: Set<string>;
  homeOrigin: HomeOrigin | null;
  onTripSelect: (trip: Trip) => void;
  onEditTrip?: (trip: Trip, e: React.MouseEvent) => void;
  emptyState: React.ReactNode;
}

export default function VirtualChronicleList({
  trips,
  isDarkPhase,
  flightTripIds,
  homeOrigin,
  onTripSelect,
  onEditTrip,
  emptyState,
}: VirtualChronicleListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tv = useTvFocus();

  const virtualizer = useVirtualizer({
    count: trips.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateCardHeight(trips[index]),
    overscan: 4,
    gap: 12,
  });

  useEffect(() => {
    tv.registerChronicleScroller((index) => {
      if (index < 0 || index >= trips.length) return;
      virtualizer.scrollToIndex(index, { align: 'center' });
    });
    tv.registerChronicleTripScroller((tripId) => {
      const index = trips.findIndex((t) => t.id === tripId);
      if (index < 0) return;
      virtualizer.scrollToIndex(index, { align: 'center' });
    });
    return () => tv.registerChronicleTripScroller(null);
  }, [tv, virtualizer, trips]);

  if (trips.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={scrollRef}
      className="sketchbook-chronicle-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const trip = trips[item.index];
          return (
            <div
              key={trip.id}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="absolute left-0 top-0 w-full pb-3"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <ChronicleLogCard
                trip={trip}
                index={item.index}
                isDarkPhase={isDarkPhase}
                isTvFocused={tv.isChronicleFocused(item.index)}
                hasFlight={flightTripIds.has(trip.id)}
                homeOrigin={homeOrigin}
                onSelect={onTripSelect}
                onEdit={onEditTrip}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
