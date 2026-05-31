import type { Trip } from '../types/travelogue';

interface MapPinProps {
  pin: Trip;
  selected: boolean;
  onClick: () => void;
  /** When true, parent SVG group handles anchor positioning */
  embedded?: boolean;
  draggable?: boolean;
}

export default function MapPin({
  pin,
  selected,
  onClick,
  embedded = false,
  draggable = false,
}: MapPinProps) {
  const isCopper = pin.material === 'copper';

  return (
    <button
      type="button"
      className={`map-pin group ${embedded ? 'map-pin-embedded' : ''} ${selected ? 'map-pin-selected' : ''} ${draggable ? 'map-pin-grabbable' : ''} ${isCopper ? 'map-pin-deep' : 'map-pin-red'}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={`${pin.name} pin`}
    >
      <span className="map-pin-dot" />
    </button>
  );
}
