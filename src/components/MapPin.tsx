import type { Trip } from '../types/travelogue';

interface MapPinProps {
  pin: Trip;
  selected: boolean;
  tvFocused?: boolean;
  onClick: () => void;
  embedded?: boolean;
  draggable?: boolean;
}

export default function MapPin({
  pin,
  selected,
  tvFocused = false,
  onClick,
  embedded = false,
  draggable = false,
}: MapPinProps) {
  const isCopper = pin.material === 'copper';

  return (
    <button
      type="button"
      className={`map-pin group ${embedded ? 'map-pin-embedded' : ''} ${selected ? 'map-pin-selected' : ''} ${tvFocused ? 'map-pin-tv-focused' : ''} ${draggable ? 'map-pin-grabbable' : ''} ${isCopper ? 'map-pin-deep' : 'map-pin-red'}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${pin.name} pin`}
    >
      <span className="map-pin-dot" />
      {tvFocused && <span className="map-pin-tv-label">{pin.name}</span>}
    </button>
  );
}
