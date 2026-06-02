import type { Trip } from '../types/travelogue';

interface SvgMapMarkerProps {
  trip: Trip;
  selected: boolean;
  tvFocused: boolean;
  hitRadius: number;
  onClick: () => void;
}

export default function SvgMapMarker({
  trip,
  selected,
  tvFocused,
  hitRadius,
  onClick,
}: SvgMapMarkerProps) {
  const isCopper = trip.material === 'copper';
  const dotClass = [
    'map-pin-svg-dot',
    isCopper ? 'map-pin-svg-dot--deep' : 'map-pin-svg-dot--red',
    selected ? 'map-pin-svg-dot--selected' : '',
    tvFocused ? 'map-pin-svg-dot--tv' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g
      className="map-pin-svg"
      role="button"
      tabIndex={-1}
      aria-label={`${trip.name} pin`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <title>{trip.name}</title>
      <circle className="map-pin-svg-hit" r={hitRadius} cx={0} cy={0} />
      <circle className={dotClass} r={5.5} cx={0} cy={0} />
    </g>
  );
}
