import { useCallback, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useEnvironmentContext } from '../context/EnvironmentContext';
import { downloadChronicleExport, readChronicleFile, type ImportTrip } from '../utils/chronicleTransfer';
import type { Trip } from '../types/travelogue';

interface ChronicleTransferProps {
  trips: Trip[];
  isDarkPhase?: boolean;
  onImport: (trips: ImportTrip[]) => void;
}

export default function ChronicleTransfer({
  trips,
  isDarkPhase = false,
  onImport,
}: ChronicleTransferProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { mobileLayout } = useEnvironmentContext();

  const shellClass = isDarkPhase
    ? 'border-white/8 bg-black/10'
    : 'border-black/8 bg-[#fcfbf9]/60';

  const iconBtnClass = isDarkPhase
    ? 'flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-neutral-200 hover:bg-white/10'
    : 'flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[#2c2c2a] hover:bg-black/5';

  const handleExport = () => {
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
  };

  const handleImportFile = useCallback(
    async (file: File) => {
      setStatus(null);
      try {
        const imported = await readChronicleFile(file);
        const replace = trips.length === 0 || window.confirm(
          `Import ${imported.length} journal${imported.length === 1 ? '' : 's'}? This will replace your current chronicle.`,
        );
        if (!replace) return;
        onImport(imported);
        setStatus({
          type: 'success',
          message: `Imported ${imported.length} journal${imported.length === 1 ? '' : 's'}.`,
        });
      } catch (err) {
        setStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'Import failed.',
        });
      }
    },
    [onImport, trips.length],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleImportFile(file);
  };

  if (mobileLayout) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
            Chronicle archive
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className={iconBtnClass}
              title="Export chronicle JSON"
              aria-label="Export chronicle JSON"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={iconBtnClass}
              title="Import chronicle JSON"
              aria-label="Import chronicle JSON"
            >
              <Upload size={16} />
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />
        {status && (
          <p
            className={`text-[10px] leading-relaxed ${
              status.type === 'error' ? 'text-red-600/90' : 'text-[#a58452]'
            }`}
          >
            {status.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans">
        <Upload size={9} className="text-[#a58452]" />
        <span>Chronicle Archive</span>
      </div>

      <div className={`flex flex-col gap-3 rounded-2xl border p-3.5 ${shellClass}`}>
        <button
          type="button"
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#a58452]/30 py-2 text-[9px] font-semibold uppercase tracking-widest text-[#a58452] transition-colors hover:border-[#a58452]/60 hover:bg-[#a58452]/5"
        >
          <Download size={12} />
          Export JSON
        </button>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-4 text-center transition-colors ${
            dragOver
              ? 'border-[#a58452] bg-[#a58452]/10'
              : isDarkPhase
                ? 'border-white/15 hover:border-white/25 hover:bg-white/5'
                : 'border-black/15 hover:border-black/25 hover:bg-black/[0.02]'
          }`}
        >
          <Upload size={18} className="text-[#a58452]/70" />
          <p className="text-[10px] font-medium uppercase tracking-widest opacity-70">
            Drop chronicle .json
          </p>
          <p className="text-[9px] font-light opacity-45">or click to browse</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />

        {status && (
          <p
            className={`text-[10px] leading-relaxed ${
              status.type === 'error' ? 'text-red-600/90' : 'text-[#a58452]'
            }`}
          >
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
