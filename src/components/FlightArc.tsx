import { memo } from 'react';

const PLANE_PATH = 'M 0 0 L 8 -0.55 L 9.5 0 L 8 0.55 Z M 1.8 -2.2 L 5 -0.55 L 1.8 -0.55 Z M 1.8 0.55 L 5 0.55 L 1.8 2.2 Z';

/** Above this count, arcs stay static — avoids hundreds of concurrent animations */
export const MAX_ANIMATED_FLIGHTS = 24;

interface FlightArcProps {
  id: string;
  pathD: string;
  duration: number;
  animatePlane: boolean;
  animationDelay: number;
}

function FlightArc({ id, pathD, duration, animatePlane, animationDelay }: FlightArcProps) {
  const arcId = `arc-${id}`;

  return (
    <g className="flight-arc-group">
      <path id={arcId} d={pathD} className="flight-arc" pathLength={100} />
      {animatePlane && (
        <g
          className="flight-plane-motion"
          style={
            {
              '--flight-path': `path('${pathD}')`,
              '--flight-duration': `${duration}s`,
              '--flight-delay': `${animationDelay}s`,
            } as React.CSSProperties
          }
        >
          <path d={PLANE_PATH} className="flight-plane" transform="translate(-1, 0)" />
        </g>
      )}
    </g>
  );
}

export default memo(FlightArc);
