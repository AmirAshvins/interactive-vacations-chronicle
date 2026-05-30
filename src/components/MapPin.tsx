import type { TravelPin } from './WorldMap';

interface MapPinProps {
  pin: TravelPin;
  selected: boolean;
  onClick: () => void;
}

export default function MapPin({ pin, selected, onClick }: MapPinProps) {
  const isCopper = pin.material === 'copper';

  return (
    <button
      type="button"
      className={`map-pin group ${selected ? 'map-pin-selected' : ''} ${isCopper ? 'map-pin-copper' : 'map-pin-brass'}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${pin.name} pin`}
    >
      <span className="map-pin-head" />
      <span className="map-pin-needle" />
      <span className="map-pin-shadow" aria-hidden />
    </button>
  );
}
