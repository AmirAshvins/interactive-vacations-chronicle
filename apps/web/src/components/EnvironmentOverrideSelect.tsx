import type { EnvironmentOverride } from '../utils/detectEnvironment';

const OPTIONS: { value: EnvironmentOverride; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

interface EnvironmentOverrideSelectProps {
  value: EnvironmentOverride;
  onChange: (value: EnvironmentOverride) => void;
  name: string;
  isDarkPhase?: boolean;
}

export default function EnvironmentOverrideSelect({
  value,
  onChange,
  name,
  isDarkPhase = false,
}: EnvironmentOverrideSelectProps) {
  return (
    <div
      className={`inline-flex rounded-full border p-0.5 ${
        isDarkPhase ? 'border-white/10 bg-black/20' : 'border-black/8 bg-black/[0.03]'
      }`}
      role="group"
      aria-label={name}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-2.5 py-1 text-[8px] font-semibold uppercase tracking-widest transition-colors ${
            value === opt.value
              ? 'bg-[#a58452] text-white'
              : isDarkPhase
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-[#5c5c58] hover:text-[#2c2c2a]'
          }`}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
