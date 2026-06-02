import type { Trip } from '../types/travelogue';
import type { MapPinStyleId } from '../data/mapPinStyles';
import { needleColorsForTrip } from '../data/mapPinStyles';

interface SvgMapMarkerProps {
  trip: Trip;
  pinStyle: MapPinStyleId;
  selected: boolean;
  tvFocused: boolean;
  stackCount: number;
}

function NeedlePinBody({
  colors,
  selected,
  tvFocused,
}: {
  colors: ReturnType<typeof needleColorsForTrip>;
  selected: boolean;
  tvFocused: boolean;
}) {
  return (
    <g className="map-pin-needle-body" pointerEvents="none">
      <path
        d="M0,0 L0.55,-14.5 L0,-15.2 L-0.55,-14.5 Z"
        fill={colors.needle}
        stroke="rgba(15,23,42,0.25)"
        strokeWidth={0.35}
      />
      <ellipse cx={0} cy={-15.8} rx={4.8} ry={1.15} fill={colors.flange} opacity={0.95} />
      <rect x={-0.55} y={-18.2} width={1.1} height={2.6} rx={0.35} fill={colors.flange} />
      <ellipse cx={0} cy={-20.4} rx={5.6} ry={4.9} fill={colors.head} />
      <ellipse cx={-1.4} cy={-21.8} rx={2.2} ry={1.6} fill={colors.headHighlight} opacity={0.55} />
      {(selected || tvFocused) && (
        <ellipse
          cx={0}
          cy={-20.4}
          rx={7.2}
          ry={6.4}
          fill="none"
          stroke={tvFocused ? '#fde047' : 'rgba(255,255,255,0.95)'}
          strokeWidth={1.4}
        />
      )}
    </g>
  );
}

function DotPinBody({
  trip,
  selected,
  tvFocused,
}: {
  trip: Trip;
  selected: boolean;
  tvFocused: boolean;
}) {
  const isCopper = trip.material === 'copper';
  const dotClass = [
    'map-pin-svg-dot',
    isCopper ? 'map-pin-svg-dot--deep' : 'map-pin-svg-dot--red',
    selected ? 'map-pin-svg-dot--selected' : '',
    tvFocused ? 'map-pin-svg-dot--tv' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <circle className={dotClass} r={5.5} cx={0} cy={0} />;
}

/** Invisible hit silhouette — matches mapPinHitTest geometry. */
function PinHitSilhouette({ pinStyle, stackCount }: { pinStyle: MapPinStyleId; stackCount: number }) {
  if (pinStyle === 'dot-classic') {
    return <circle className="map-pin-svg-hit" r={9} cx={0} cy={0} />;
  }

  return (
    <g className="map-pin-svg-hit">
      <circle r={11} cx={0} cy={0} />
      <ellipse cx={0} cy={-12} rx={10} ry={15} />
      {stackCount > 1 && <circle r={11} cx={8} cy={-24} />}
    </g>
  );
}

export default function SvgMapMarker({
  trip,
  pinStyle,
  selected,
  tvFocused,
  stackCount,
}: SvgMapMarkerProps) {
  const isCopper = trip.material === 'copper';
  const useNeedle = pinStyle !== 'dot-classic';
  const colors = needleColorsForTrip(pinStyle, isCopper);

  return (
    <g className="map-pin-svg" aria-hidden>
      <PinHitSilhouette pinStyle={pinStyle} stackCount={stackCount} />
      {useNeedle ? (
        <NeedlePinBody colors={colors} selected={selected} tvFocused={tvFocused} />
      ) : (
        <DotPinBody trip={trip} selected={selected} tvFocused={tvFocused} />
      )}
      {stackCount > 1 && (
        <g className="map-pin-stack-badge" transform="translate(8, -24)" pointerEvents="none">
          <circle r={7.5} className="map-pin-stack-badge-bg" />
          <text
            y={0.35}
            textAnchor="middle"
            className="map-pin-stack-badge-text"
            fontSize={stackCount > 99 ? 5.5 : 6.5}
          >
            {stackCount > 99 ? '99+' : stackCount}
          </text>
        </g>
      )}
    </g>
  );
}

/** Small pin for list rows (stack picker, etc.) */
export function SvgMapMarkerMini({
  trip,
  pinStyle,
  scale = 0.55,
}: {
  trip: Trip;
  pinStyle: MapPinStyleId;
  scale?: number;
}) {
  const isCopper = trip.material === 'copper';
  const useNeedle = pinStyle !== 'dot-classic';
  const colors = needleColorsForTrip(pinStyle, isCopper);

  return (
    <svg
      viewBox="-12 -30 24 32"
      width={24}
      height={28}
      className="map-pin-mini shrink-0 overflow-visible"
      aria-hidden
    >
      <g transform={`scale(${scale})`}>
        {useNeedle ? (
          <NeedlePinBody colors={colors} selected={false} tvFocused={false} />
        ) : (
          <DotPinBody trip={trip} selected={false} tvFocused={false} />
        )}
      </g>
    </svg>
  );
}
