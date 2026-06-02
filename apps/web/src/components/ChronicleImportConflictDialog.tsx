import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ChronicleImportConflictDialogProps {
  open: boolean;
  isDarkPhase?: boolean;
  conflictCount: number;
  newCount: number;
  importLabel: string;
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

export default function ChronicleImportConflictDialog({
  open,
  isDarkPhase = false,
  conflictCount,
  newCount,
  importLabel,
  onMerge,
  onReplace,
  onCancel,
}: ChronicleImportConflictDialogProps) {
  if (!open) return null;

  const shellClass = isDarkPhase
    ? 'border-white/10 bg-[#121214]/95 text-neutral-200'
    : 'border-black/8 bg-[#faf9f6]/98 text-[#2c2c2a]';

  const btnSecondary = isDarkPhase
    ? 'border-white/15 bg-black/25 text-neutral-200 hover:bg-black/40'
    : 'border-black/10 bg-white text-[#2c2c2a] hover:bg-black/[0.03]';

  return createPortal(
    <div className="trip-dialog-portal" onClick={onCancel} role="presentation">
      <div className="trip-dialog-backdrop" aria-hidden />
      <div
        className={`trip-dialog-panel border shadow-2xl ${shellClass}`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chronicle-import-conflict-title"
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4 ${isDarkPhase ? 'border-white/10' : 'border-black/8'}`}
        >
          <h3
            id="chronicle-import-conflict-title"
            className="text-lg font-light"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Journal already exists
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-full p-2 opacity-60 hover:opacity-100"
            aria-label="Cancel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-[11px] font-light leading-relaxed opacity-75">
            {conflictCount} journal{conflictCount === 1 ? '' : 's'} from{' '}
            <span className="font-medium opacity-100">{importLabel}</span> match entries already in
            your chronicle.
            {newCount > 0
              ? ` ${newCount} new journal${newCount === 1 ? '' : 's'} can be added.`
              : ' There are no new journals to add.'}
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onMerge}
              disabled={newCount === 0}
              className="rounded-full bg-[#a58452] px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-white hover:bg-[#b59563] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Merge with current
            </button>
            <p className="px-1 text-[9px] font-light leading-relaxed opacity-45">
              Keep your existing journals for matching IDs; add only new ones from the import.
            </p>

            <button
              type="button"
              onClick={onReplace}
              className={`rounded-full border px-4 py-3 text-[9px] font-semibold uppercase tracking-widest ${btnSecondary}`}
            >
              Replace chronicle
            </button>
            <p className="px-1 text-[9px] font-light leading-relaxed opacity-45">
              Discard your current chronicle and use the full import instead.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
