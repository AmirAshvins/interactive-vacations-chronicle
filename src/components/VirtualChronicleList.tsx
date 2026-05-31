import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Trip } from '../types/travelogue';
import type { HomeOrigin } from '../utils/flightRoutes';
import ChronicleLogCard, { estimateCardHeight } from './ChronicleLogCard';

interface VirtualChronicleListProps {
  trips: Trip[];
  isDarkPhase: boolean;
  flightTripIds: Set<string>;
  homeOrigin: HomeOrigin | null;
  onTripSelect: (trip: Trip) => void;
  onEditTrip: (trip: Trip, e: React.MouseEvent) => void;
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

  const virtualizer = useVirtualizer({
    count: trips.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateCardHeight(trips[index]),
    overscan: 4,
    gap: 12,
  });

  if (trips.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-container">
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
