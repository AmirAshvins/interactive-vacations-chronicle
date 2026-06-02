import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import { useTvFocus } from '../context/TvFocusContext';
import ChronicleImportDialog, {
  type ChronicleImportResult,
} from './ChronicleImportDialog';
import { downloadChronicleExport } from '../utils/chronicleTransfer';
import type { Trip } from '../types/travelogue';

interface ChronicleTransferProps {
  trips: Trip[];
  isDarkPhase?: boolean;
  onImport: (result: ChronicleImportResult) => void;
}

export default function ChronicleTransfer({
  trips,
  isDarkPhase = false,
  onImport,
}: ChronicleTransferProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { mobileLayout, tvInteraction } = useEnvironmentContext();
  const tv = useTvFocus();

  const shellClass = isDarkPhase
    ? 'border-white/8 bg-black/10'
    : 'border-black/8 bg-[#fcfbf9]/60';

  const handleExport = useCallback(() => {
    if (trips.length === 0) {
      setStatus({ type: 'error', message: 'Nothing to export — add a journal first.' });
      return;
    }
    void downloadChronicleExport(trips)
      .then(() => {
        setStatus({
          type: 'success',
          message: `Exported ${trips.length} journal${trips.length === 1 ? '' : 's'}.`,
        });
      })
      .catch(() => {
        setStatus({ type: 'error', message: 'Export failed.' });
      });
  }, [trips]);

  const handleOpenImport = useCallback(() => {
    setStatus(null);
    setImportOpen(true);
  }, []);

  const handleImported = useCallback(
    (result: ChronicleImportResult) => {
      onImport(result);
      const { trips, label, resolution, addedCount, conflictCount } = result;
      const message =
        resolution === 'merge' && addedCount !== undefined
          ? `Merged ${addedCount} new journal${addedCount === 1 ? '' : 's'} from ${label}${
              conflictCount ? `; kept ${conflictCount} existing.` : '.'
            }`
          : `Imported ${trips.length} journal${trips.length === 1 ? '' : 's'} from ${label}.`;
      setStatus({ type: 'success', message });
    },
    [onImport],
  );

  useEffect(() => {
    if (!tvInteraction) {
      tv.registerArchiveActions(null);
      tv.registerImportDialog(null);
      return;
    }
    tv.registerArchiveActions({
      onExport: handleExport,
      onOpenImport: handleOpenImport,
    });
    tv.registerImportDialog({
      isOpen: importOpen,
      onClose: () => setImportOpen(false),
    });
    return () => {
      tv.registerArchiveActions(null);
      tv.registerImportDialog(null);
    };
  }, [tvInteraction, tv, handleExport, handleOpenImport, importOpen]);

  useEffect(() => {
    if (!tvInteraction || (!tv.isArchiveExportFocused && !tv.isArchiveImportFocused)) return;
    blockRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [tvInteraction, tv.isArchiveExportFocused, tv.isArchiveImportFocused]);

  const statusLine = status ? (
    <p
      className={`text-[10px] leading-relaxed ${
        status.type === 'error' ? 'text-red-600/90' : 'text-[#a58452]'
      }`}
    >
      {status.message}
    </p>
  ) : null;

  const btnClass = mobileLayout
    ? isDarkPhase
      ? 'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/20 text-[9px] font-semibold uppercase tracking-widest text-neutral-200'
      : 'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white/80 text-[9px] font-semibold uppercase tracking-widest text-[#2c2c2a]'
    : tvInteraction
      ? isDarkPhase
        ? 'flex min-h-[var(--env-tv-touch-min,48px)] flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-black/20 text-[10px] font-semibold uppercase tracking-widest text-neutral-100'
        : 'flex min-h-[var(--env-tv-touch-min,48px)] flex-1 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/80 text-[10px] font-semibold uppercase tracking-widest text-[#2c2c2a]'
      : 'flex flex-1 items-center justify-center gap-2 rounded-full border border-[#a58452]/30 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#a58452] transition-colors hover:border-[#a58452]/60 hover:bg-[#a58452]/5';

  const iconSize = mobileLayout ? 14 : 13;

  return (
    <div ref={blockRef} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
        <Upload size={9} className="text-[#a58452]" />
        <span>Chronicle Archive</span>
      </div>

      <div className={`flex flex-col gap-2 rounded-2xl border p-3 ${shellClass} ${mobileLayout ? 'p-2.5' : ''}`}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className={`${btnClass} ${tvInteraction && tv.isArchiveExportFocused ? 'tv-focused' : ''}`}
          >
            <Download size={iconSize} />
            Export
          </button>
          <button
            type="button"
            onClick={handleOpenImport}
            className={`${btnClass} ${tvInteraction && tv.isArchiveImportFocused ? 'tv-focused' : ''}`}
          >
            <Upload size={iconSize} />
            Import
          </button>
        </div>
        {statusLine}
      </div>

      <ChronicleImportDialog
        open={importOpen}
        isDarkPhase={isDarkPhase}
        existingTrips={trips}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />
    </div>
  );
}
