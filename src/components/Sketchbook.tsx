import { useState } from 'react';
import type { TravelPin, FlightRoute } from './WorldMap';
import type { Memory } from '../hooks/useTravelogueStore';
import { X, Plane, Trash2, Award, Compass, PenLine } from 'lucide-react';

interface SketchbookProps {
  embedded?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isDarkPhase?: boolean;
  pins: TravelPin[];
  flights: FlightRoute[];
  memories: Memory[];
  onPinSelect: (pin: TravelPin) => void;
  onAddFlight: (fromKey: string, toKey: string) => void;
  onRemoveFlight: (flightId: string) => void;
  onAddMemory: (pinId: string, title: string, body: string, quote?: string) => void;
  isOverlayVisible?: boolean;
}

export default function Sketchbook({
  embedded = false,
  isOpen = true,
  onClose,
  isDarkPhase = false,
  pins,
  flights,
  memories,
  onPinSelect,
  onAddFlight,
  onRemoveFlight,
  onAddMemory,
  isOverlayVisible = true,
}: SketchbookProps) {
  const [composerFrom, setComposerFrom] = useState('vancouver');
  const [composerTo, setComposerTo] = useState('tehran');
  const [memoryPinId, setMemoryPinId] = useState(pins[0]?.id ?? '');
  const [memoryTitle, setMemoryTitle] = useState('');
  const [memoryBody, setMemoryBody] = useState('');
  const [memoryQuote, setMemoryQuote] = useState('');
  
  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryPinId || !memoryTitle.trim() || !memoryBody.trim()) return;
    onAddMemory(memoryPinId, memoryTitle.trim(), memoryBody.trim(), memoryQuote.trim() || undefined);
    setMemoryTitle('');
    setMemoryBody('');
    setMemoryQuote('');
  };

  const getSubtitle = (key: string) => {
    const map: Record<string, string> = {
      vancouver: 'The Mountain Haven',
      toronto: 'The Family Anchor',
      tehran: 'The Heritage Cradle',
    };
    return map[key] ?? 'Memorable Destination';
  };

  const pinMemories = (pinId: string) => memories.filter((m) => m.pinId === pinId);

  const handleComposeFlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (composerFrom === composerTo) return;
    onAddFlight(composerFrom, composerTo);
  };

  // Calculate statistics dynamically
  const totalCities = pins.length;
  const activeRoutes = flights.length;
  
  // Approximations of flight distances (Toronto - Tehran is ~5300 NM, Toronto - Vancouver is ~1800 NM, Vancouver - Tehran is ~5900 NM)
  const calculateTotalDistance = () => {
    let distance = 0;
    flights.forEach((f) => {
      if ((f.fromCity === 'toronto' && f.toCity === 'tehran') || (f.fromCity === 'tehran' && f.toCity === 'toronto')) distance += 5300;
      else if ((f.fromCity === 'toronto' && f.toCity === 'vancouver') || (f.fromCity === 'vancouver' && f.toCity === 'toronto')) distance += 1800;
      else if ((f.fromCity === 'vancouver' && f.toCity === 'tehran') || (f.fromCity === 'tehran' && f.toCity === 'vancouver')) distance += 5900;
      else distance += 2500; // generic fallback
    });
    return distance;
  };

  // Archival numbering for aesthetic architectural files
  const getIndexLabel = (idx: number) => {
    return `[ ARCHIVE 0${idx + 1} ]`;
  };

  const cardClass = isDarkPhase
    ? 'bg-black/10 border-white/5'
    : 'bg-[#fcfbf9]/60 border-black/5';

  const sectionLabelClass = 'flex items-center gap-2 text-[8px] uppercase tracking-[0.25em] opacity-40 font-semibold font-sans';

  const inactiveBtnClass = isDarkPhase
    ? 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
    : 'bg-black/5 text-[#2c2c2a] hover:bg-black/8';

  const inputClass = isDarkPhase
    ? 'rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-neutral-200 outline-none placeholder:text-neutral-500 focus:border-[#a58452]/40'
    : 'rounded-lg border border-black/8 bg-white/60 px-3 py-2 text-xs outline-none focus:border-[#a58452]/40';

  const dividerClass = isDarkPhase ? 'border-white/5' : 'border-black/5';

  const body = (
    <div className="flex h-full flex-col overflow-y-auto p-5 scroll-container gap-5">
        
        {/* SECTION 1: ARCHITECTURAL TRAVEL STATISTICS */}
        <div className="flex flex-col gap-2">
          <div className={sectionLabelClass}>
            <Award size={9} className="text-[#a58452]" />
            <span>Journey Diagnostics</span>
          </div>
          
          <div className={`flex justify-between items-center py-4 border-y font-sans mt-1 ${dividerClass}`}>
            <div className="flex flex-col items-start">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-semibold">Archived Cities</span>
              <span className={`text-xl font-extralight mt-1 ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>{totalCities}</span>
            </div>
            <div className={`h-6 w-px ${isDarkPhase ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className="flex flex-col items-start">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-semibold">Plotted Flights</span>
              <span className={`text-xl font-extralight mt-1 ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}>{activeRoutes}</span>
            </div>
            <div className={`h-6 w-px ${isDarkPhase ? 'bg-white/5' : 'bg-black/5'}`} />
            <div className="flex flex-col items-start">
              <span className="text-[8px] uppercase tracking-widest opacity-50 font-semibold">Total Mileage</span>
              <span className="text-xs font-mono text-[#a58452] font-semibold mt-2">{calculateTotalDistance().toLocaleString()} NM</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: THE FAMILY LOGS (PRELOADED TEXTS) */}
        <div className="flex flex-col gap-2.5">
          <div className={sectionLabelClass}>
            <Compass size={9} className="text-[#a58452]" />
            <span>Curation Logs</span>
          </div>

          <div className="flex flex-col gap-3">
            {pins.map((pin, idx) => {
              const entries = pinMemories(pin.id);
              return (
                <div
                  key={pin.id}
                  onClick={() => onPinSelect(pin)}
                  className={`group relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
                    isDarkPhase
                      ? 'border-transparent bg-black/10 hover:border-white/5 hover:bg-black/20'
                      : 'border-transparent bg-[#fcfbf9]/50 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-black/5 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="absolute bottom-0 left-0 top-0 w-[2px] origin-center scale-y-0 bg-[#a58452] transition-transform duration-300 group-hover:scale-y-100" />

                  <div className="flex items-center justify-between text-[8.5px] font-mono font-semibold uppercase tracking-widest text-[#a58452]">
                    <span>{getIndexLabel(idx)}</span>
                    <span className="font-mono opacity-40 transition-opacity group-hover:opacity-80">
                      {pin.lat.toFixed(2)}° N, {Math.abs(pin.lng).toFixed(2)}° W
                    </span>
                  </div>

                  <span
                    className={`mt-0.5 text-lg font-light ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}
                    style={{ fontFamily: 'var(--font-serif)', letterSpacing: '0.02em' }}
                  >
                    {pin.name}
                  </span>

                  <span className="-mt-2 font-sans text-[8.5px] font-semibold uppercase tracking-widest text-[#a58452] opacity-60">
                    {getSubtitle(pin.cityKey)}
                  </span>

                  <p className={`mt-1 text-[11.5px] font-light leading-relaxed opacity-90 ${isDarkPhase ? 'text-neutral-400' : 'text-[#5c5c58]'}`}>
                    {pin.description}
                  </p>

                  {entries.map((mem) => (
                    <div key={mem.id} className="mt-2 border-l-2 border-[#a58452]/25 pl-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a58452]">{mem.title}</p>
                      <p className={`mt-1 text-[11px] font-light leading-relaxed ${isDarkPhase ? 'text-neutral-400' : 'text-[#5c5c58]'}`}>{mem.body}</p>
                      {mem.quote && (
                        <p className={`mt-1 text-xs italic opacity-70 ${isDarkPhase ? 'text-neutral-500' : 'text-[#7c7c78]'}`} style={{ fontFamily: 'var(--font-serif)' }}>
                          {mem.quote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: FLIGHT COMPOSER */}
        <div className={`flex flex-col gap-2.5 border-t pt-6 ${dividerClass}`}>
          <div className={sectionLabelClass}>
            <Plane size={9} className="text-[#a58452]" />
            <span>Flight Arc Composer</span>
          </div>

          <form onSubmit={handleComposeFlight} className={`flex flex-col gap-4 p-4 rounded-2xl border ${cardClass}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-[8px] font-semibold uppercase tracking-widest opacity-50">Origin</label>
                <div className="flex flex-col gap-1">
                  {pins.map((p) => (
                    <button
                      key={`from-${p.id}`}
                      type="button"
                      onClick={() => setComposerFrom(p.cityKey)}
                      className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition-all ${
                        composerFrom === p.cityKey
                          ? 'bg-[#a58452] text-white'
                          : inactiveBtnClass
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[8px] font-semibold uppercase tracking-widest opacity-50">Destination</label>
                <div className="flex flex-col gap-1">
                  {pins.map((p) => (
                    <button
                      key={`to-${p.id}`}
                      type="button"
                      onClick={() => setComposerTo(p.cityKey)}
                      className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition-all ${
                        composerTo === p.cityKey
                          ? 'bg-[#a58452] text-white'
                          : inactiveBtnClass
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={composerFrom === composerTo}
              className={`w-full py-2.5 rounded-full text-[9px] uppercase tracking-widest font-semibold transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-95 ${
                composerFrom === composerTo
                  ? isDarkPhase
                    ? 'bg-white/5 text-neutral-600 cursor-not-allowed border border-white/5'
                    : 'bg-neutral-200/40 text-neutral-400 cursor-not-allowed border border-neutral-300/10'
                  : isDarkPhase
                    ? 'bg-[#a58452] hover:bg-[#b59563] text-white shadow-md hover:shadow-lg'
                    : 'bg-[#16120e] hover:bg-[#251e18] text-[#faf9f6] shadow-md hover:shadow-lg'
              }`}
            >
              Compose Flight Path
            </button>
          </form>

          {flights.length > 0 ? (
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-[8px] uppercase tracking-widest font-sans font-semibold opacity-50">Active Trajectories</label>
              <div className="flex flex-col gap-1.5">
                {flights.map((f) => {
                  const fromPin = pins.find((p) => p.cityKey === f.fromCity);
                  const toPin = pins.find((p) => p.cityKey === f.toCity);
                  return (
                    <div
                      key={f.id}
                      className={`flex justify-between items-center px-4 py-2.5 rounded-2xl border text-xs ${cardClass} ${isDarkPhase ? 'text-neutral-200' : 'text-[#2c2c2a]'}`}
                    >
                      <div className="flex items-center gap-2.5 font-light">
                        <Plane size={10} className="text-[#a58452] rotate-45" />
                        <span className="font-semibold text-[11px]">{fromPin?.name || f.fromCity}</span>
                        <span className="text-[#a58452] opacity-70">⟶</span>
                        <span className="font-semibold text-[11px]">{toPin?.name || f.toCity}</span>
                      </div>
                      <button
                        onClick={() => onRemoveFlight(f.id)}
                        className={`p-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                          isDarkPhase
                            ? 'text-neutral-500 hover:text-[#e57373] hover:bg-white/5'
                            : 'text-[#7c7c78] hover:text-[#c0392b] hover:bg-black/5'
                        }`}
                        title="Delete Route"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`text-center py-5 rounded-2xl border border-dashed text-[9px] uppercase tracking-widest font-light mt-1 opacity-60 ${cardClass}`}>
              No Flights Plotted
            </div>
          )}
        </div>

        {/* SECTION 4: MEMORY COMPOSER */}
        <div className={`flex flex-col gap-2.5 border-t pt-6 ${dividerClass}`}>
          <div className={sectionLabelClass}>
            <PenLine size={9} className="text-[#a58452]" />
            <span>Journal Entry</span>
          </div>
          <form onSubmit={handleAddMemory} className={`flex flex-col gap-3 rounded-2xl border p-4 ${cardClass}`}>
            <div className="flex flex-wrap gap-1">
              {pins.map((p) => (
                <button
                  key={`mem-${p.id}`}
                  type="button"
                  onClick={() => setMemoryPinId(p.id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                    memoryPinId === p.id ? 'bg-[#a58452] text-white' : inactiveBtnClass
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <input
              value={memoryTitle}
              onChange={(e) => setMemoryTitle(e.target.value)}
              placeholder="Entry title"
              className={inputClass}
            />
            <textarea
              value={memoryBody}
              onChange={(e) => setMemoryBody(e.target.value)}
              placeholder="Write a memory..."
              rows={3}
              className={`resize-none ${inputClass}`}
            />
            <input
              value={memoryQuote}
              onChange={(e) => setMemoryQuote(e.target.value)}
              placeholder="Optional quote"
              className={`italic ${inputClass}`}
            />
            <button
              type="submit"
              className={`rounded-full py-2.5 text-[9px] font-semibold uppercase tracking-widest transition-all ${
                isDarkPhase
                  ? 'bg-[#a58452] hover:bg-[#b59563] text-white'
                  : 'bg-[#16120e] hover:bg-[#251e18] text-[#faf9f6]'
              }`}
            >
              Save to Chronicle
            </button>
          </form>
        </div>
    </div>
  );

  if (embedded) return body;

  return (
    <div
      className={`fixed left-8 top-8 bottom-28 z-40 flex w-[min(380px,30vw)] flex-col overflow-hidden rounded-2xl border tv-hud-element ${
        isOpen && isOverlayVisible ? 'opacity-100 translate-x-0' : 'tv-hud-hidden-left pointer-events-none'
      } ${
        isDarkPhase
          ? 'border-white/5 bg-[#121214]/88 text-neutral-200'
          : 'border-black/6 bg-[#faf9f6]/92'
      }`}
    >
      <div className={`flex items-center justify-between border-b p-5 ${isDarkPhase ? 'border-white/5' : 'border-black/5'}`}>
        <div>
          <h2 className="text-xl font-extralight tracking-wide" style={{ fontFamily: 'var(--font-serif)' }}>
            The Sketchbook
          </h2>
          <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.25em] opacity-40">
            Family Chronicles
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full p-2 transition-colors ${
              isDarkPhase ? 'text-neutral-400 hover:bg-white/5 hover:text-white' : 'text-[#7c7c78] hover:bg-black/5'
            }`}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {body}
    </div>
  );
}
