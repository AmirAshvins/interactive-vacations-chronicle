import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, Upload, X } from 'lucide-react';
import { readChronicleFile, type ImportTrip } from '../utils/chronicleTransfer';
import { importTripsFromTemplateCode } from '../utils/chronicleTemplateImport';
import {
  countNewImportTrips,
  findImportConflicts,
  type ChronicleImportResolution,
} from '../utils/chronicleImportResolve';
import ChronicleImportConflictDialog from './ChronicleImportConflictDialog';
import type { Trip } from '../types/travelogue';

export interface ChronicleImportResult {
  trips: ImportTrip[];
  label: string;
  resolution: ChronicleImportResolution;
  addedCount?: number;
  conflictCount?: number;
}

interface ChronicleImportDialogProps {
  open: boolean;
  isDarkPhase?: boolean;
  existingTrips: Trip[];
  onClose: () => void;
  onImported: (result: ChronicleImportResult) => void;
}

interface PendingImport {
  trips: ImportTrip[];
  label: string;
  conflictCount: number;
  newCount: number;
}

export default function ChronicleImportDialog({
  open,
  isDarkPhase = false,
  existingTrips,
  onClose,
  onImported,
}: ChronicleImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingImport | null>(null);

  const shellClass = isDarkPhase
    ? 'border-white/10 bg-[#121214]/95 text-neutral-200'
    : 'border-black/8 bg-[#faf9f6]/98 text-[#2c2c2a]';

  const sectionShell = isDarkPhase
    ? 'border-white/8 bg-black/15'
    : 'border-black/8 bg-[#fcfbf9]/60';

  const inputClass = isDarkPhase
    ? 'border-white/15 bg-black/30 text-neutral-100 placeholder:text-neutral-500'
    : 'border-black/10 bg-white text-[#2c2c2a] placeholder:text-black/35';

  const finishImport = useCallback(
    (trips: ImportTrip[], label: string, resolution: ChronicleImportResolution, meta?: PendingImport) => {
      onImported({
        trips,
        label,
        resolution,
        addedCount: meta?.newCount,
        conflictCount: meta?.conflictCount,
      });
      setCode('');
      setStatus(null);
      setPending(null);
      onClose();
    },
    [onClose, onImported],
  );

  const proceedWithImport = useCallback(
    (imported: ImportTrip[], label: string) => {
      const hasExisting = existingTrips.length > 0;
      const conflicts = hasExisting ? findImportConflicts(existingTrips, imported) : [];
      const conflictCount = conflicts.length;
      const newCount = hasExisting ? countNewImportTrips(existingTrips, imported) : imported.length;

      if (hasExisting && conflictCount > 0) {
        setPending({ trips: imported, label, conflictCount, newCount });
        return;
      }

      finishImport(imported, label, 'replace');
    },
    [existingTrips, finishImport],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setStatus(null);
      setBusy(true);
      try {
        const imported = await readChronicleFile(file);
        proceedWithImport(imported, 'file');
      } catch (err) {
        setStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'Import failed.',
        });
      } finally {
        setBusy(false);
      }
    },
    [proceedWithImport],
  );

  const handleApplyCode = useCallback(async () => {
    setStatus(null);
    setBusy(true);
    try {
      const { trips: imported, template } = await importTripsFromTemplateCode(code);
      proceedWithImport(imported, template.title);
    } catch (err) {
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Import failed.',
      });
    } finally {
      setBusy(false);
    }
  }, [code, proceedWithImport]);

  if (!open && !pending) return null;

  return (
    <>
      {open
        ? createPortal(
            <div className="trip-dialog-portal" onClick={onClose} role="presentation">
              <div className="trip-dialog-backdrop" aria-hidden />
              <div
                className={`trip-dialog-panel border shadow-2xl ${shellClass}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="chronicle-import-title"
              >
                <div
                  className={`flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4 ${isDarkPhase ? 'border-white/10' : 'border-black/8'}`}
                >
                  <div className="min-w-0">
                    <h3
                      id="chronicle-import-title"
                      className="truncate text-lg font-light"
                      style={{ fontFamily: 'var(--font-serif)' }}
                    >
                      Import Chronicle
                    </h3>
                    <p className="mt-0.5 text-[9px] uppercase tracking-widest opacity-50">
                      File or private template code
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-full p-2 opacity-60 hover:opacity-100"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-4">
                  <section className={`flex flex-col gap-2.5 rounded-2xl border p-4 ${sectionShell}`}>
                    <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-[#a58452]">
                      <Upload size={11} />
                      Import from file
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => !busy && fileRef.current?.click()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!busy) setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        if (busy) return;
                        const file = e.dataTransfer.files[0];
                        if (file) void handleFile(file);
                      }}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-5 text-center transition-colors ${
                        dragOver
                          ? 'border-[#a58452] bg-[#a58452]/10'
                          : isDarkPhase
                            ? 'border-white/15 hover:border-white/25 hover:bg-white/5'
                            : 'border-black/15 hover:border-black/25 hover:bg-black/[0.02]'
                      } ${busy ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <Upload size={20} className="text-[#a58452]/70" />
                      <p className="text-[10px] font-medium uppercase tracking-widest opacity-70">
                        Drop chronicle .json
                      </p>
                      <p className="text-[9px] font-light opacity-45">or tap to browse</p>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = '';
                      }}
                    />
                  </section>

                  <section className={`flex flex-col gap-2.5 rounded-2xl border p-4 ${sectionShell}`}>
                    <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-widest text-[#a58452]">
                      <KeyRound size={11} />
                      Import by code
                    </div>
                    <p className="text-[9px] font-light leading-relaxed opacity-50">
                      Enter a chronicle code you received — templates are not listed here.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !busy) {
                            e.preventDefault();
                            void handleApplyCode();
                          }
                        }}
                        placeholder="Enter code"
                        disabled={busy}
                        className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-[11px] font-light tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-[#a58452]/40 ${inputClass}`}
                        aria-label="Chronicle template code"
                      />
                      <button
                        type="button"
                        onClick={() => void handleApplyCode()}
                        disabled={busy || !code.trim()}
                        className="shrink-0 rounded-full bg-[#a58452] px-4 py-2.5 text-[9px] font-semibold uppercase tracking-widest text-white hover:bg-[#b59563] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Import
                      </button>
                    </div>
                  </section>

                  {status ? (
                    <p
                      className={`text-[10px] leading-relaxed ${
                        status.type === 'error' ? 'text-red-600/90' : 'text-[#a58452]'
                      }`}
                    >
                      {status.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <ChronicleImportConflictDialog
        open={pending !== null}
        isDarkPhase={isDarkPhase}
        conflictCount={pending?.conflictCount ?? 0}
        newCount={pending?.newCount ?? 0}
        importLabel={pending?.label ?? 'import'}
        onMerge={() => {
          if (!pending) return;
          finishImport(pending.trips, pending.label, 'merge', pending);
        }}
        onReplace={() => {
          if (!pending) return;
          finishImport(pending.trips, pending.label, 'replace', pending);
        }}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
