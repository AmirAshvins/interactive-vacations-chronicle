interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  title?: string;
}

export default function ToggleSwitch({ checked, onChange, label, title }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a58452]/40 ${
        checked ? 'bg-[#a58452]' : 'bg-neutral-300/40 dark:bg-neutral-700/60'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
