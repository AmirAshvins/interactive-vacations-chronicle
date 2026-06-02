import { memo } from 'react';
import type { FlightDashStyle } from '../utils/flightArc';

const PLANE_PATH = 'M 0 0 L 8 -0.55 L 9.5 0 L 8 0.55 Z M 1.8 -2.2 L 5 -0.55 L 1.8 -0.55 Z M 1.8 0.55 L 5 0.55 L 1.8 2.2 Z';

/** Above this count, arcs stay static — avoids hundreds of concurrent animations */
export const MAX_ANIMATED_FLIGHTS = 24;

interface FlightArcProps {
  id: string;
  pathD: string;
  dash: FlightDashStyle;
  duration: number;
  animatePlane: boolean;
  animationDelay: number;
}

function FlightArc({
  id,
  pathD,
  dash,
  duration,
  animatePlane,
  animationDelay,
}: FlightArcProps) {
  const arcId = `arc-${id}`;

  return (
    <g className="flight-arc-group">
      <path
        id={arcId}
        d={pathD}
        className="flight-arc"
        style={{
          strokeDasharray: dash.strokeDasharray,
          strokeDashoffset: dash.strokeDashoffset,
          opacity: dash.opacity,
        }}
      />
      {animatePlane && (
        <path
          d={PLANE_PATH}
          className="flight-plane flight-plane-motion"
          transform="translate(-1, 0)"
          style={
            {
              offsetPath: `url(#${arcId})`,
              '--flight-duration': `${duration}s`,
              '--flight-delay': `${animationDelay}s`,
            } as React.CSSProperties
          }
        />
      )}
    </g>
  );
}

export default memo(FlightArc);
