import { Monitor, Smartphone, Tv } from 'lucide-react';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import EnvironmentOverrideSelect from './EnvironmentOverrideSelect';
import ToggleSwitch from './ToggleSwitch';

interface EnvironmentControlsProps {
  isDarkPhase?: boolean;
}

export default function EnvironmentControls({ isDarkPhase = false }: EnvironmentControlsProps) {
  const env = useEnvironmentContext();

  const cardClass = isDarkPhase
    ? 'bg-black/10 border-white/5'
    : 'bg-[#fcfbf9]/60 border-black/5';

  const rowLabel =
    'flex items-center gap-2 text-[10px] font-light uppercase tracking-wider opacity-80';

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
        <Monitor size={9} className="text-[#a58452]" />
        <span>Environment</span>
      </div>

      <div className={`flex flex-col gap-4 rounded-2xl border p-4 ${cardClass}`}>
        <p className="text-[9px] font-mono uppercase tracking-widest text-[#a58452]/90">
          Detected: {env.detected.label}
        </p>

        <div className="flex items-center justify-between gap-3">
          <div className={rowLabel}>
            <Tv size={11} className="opacity-40" />
            <span>TV Screensaver</span>
          </div>
          <ToggleSwitch
            checked={env.isTvScreensaver}
            onChange={() => env.setTvScreensaver(!env.isTvScreensaver)}
            label="TV Screensaver"
            title="Hide HUD after idle for living-room display"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-black/5 pt-3 dark:border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className={rowLabel}>
              <Tv size={11} className="opacity-40" />
              <span>TV Remote Nav</span>
            </div>
            <EnvironmentOverrideSelect
              name="TV remote navigation"
              value={env.tvInteractionOverride}
              onChange={env.setTvInteractionOverride}
              isDarkPhase={isDarkPhase}
            />
          </div>
          <p className="text-[8.5px] font-light leading-relaxed opacity-45">
            {env.tvInteraction
              ? 'Active — arrow keys & focus ring (TV device only when Auto)'
              : 'Off — mouse / touch only'}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-black/5 pt-3 dark:border-white/5">
          <div className="flex items-center justify-between gap-3">
            <div className={rowLabel}>
              <Smartphone size={11} className="opacity-40" />
              <span>Mobile Layout</span>
            </div>
            <EnvironmentOverrideSelect
              name="Mobile layout"
              value={env.mobileLayoutOverride}
              onChange={env.setMobileLayoutOverride}
              isDarkPhase={isDarkPhase}
            />
          </div>
          <p className="text-[8.5px] font-light leading-relaxed opacity-45">
            {env.mobileLayout
              ? 'Active — bottom sheet & compact controls (viewport < 768px)'
              : 'Off — side panel layout (wide viewport; touch still works on tablets)'}
          </p>
        </div>
      </div>
    </div>
  );
}
