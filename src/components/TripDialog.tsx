import { useState, useRef, useEffect, useMemo } from 'react';
import type { Trip } from '../types/travelogue';
import type { TripImageChanges } from '../hooks/useTravelogueStore';
import { getCountryName, MONTH_OPTIONS } from '../utils/countryUtils';
import {
  findCityById,
  getCitiesForCountry,
  getDefaultCityForCountry,
  matchCityForTrip,
  type WorldCity,
} from '../data/worldCities';
import { readImageBlobsFromFiles } from './ImageCarousel';
import { getImageObjectUrl } from '../db/tripImages';
import { X, Upload, Trash2, MapPin, Search } from 'lucide-react';

const CUSTOM_CITY_ID = '__custom__';

interface TripDialogProps {
  open: boolean;
  trip: Trip | null;
  countryOptions: { code: string; name: string }[];
  isDarkPhase?: boolean;
  onSave: (trip: Trip, imageChanges?: TripImageChanges) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

type DraftImage =
  | { kind: 'stored'; id: string; preview: string }
  | { kind: 'pending'; blob: Blob; preview: string };

function cityToDraftFields(city: WorldCity) {
  return {
    cityKey: city.id,
    name: city.name,
    lat: city.lat,
    lng: city.lng,
  };
}

function emptyTrip(countryCode = 'ca'): Trip {
  const city = getDefaultCityForCountry(countryCode);
  return {
    id: `trip-${Date.now()}`,
    countryCode,
    cityKey: city?.id,
    name: city?.name ?? '',
    lat: city?.lat ?? 0,
    lng: city?.lng ?? 0,
    description: '',
    material: 'brass',
    imageIds: [],
  };
}

function resolveInitialCityKey(t: Trip): string {
  if (t.cityKey && findCityById(t.cityKey)) return t.cityKey;
  const matched = matchCityForTrip(t.countryCode, t.name, t.lat, t.lng);
  return matched?.id ?? CUSTOM_CITY_ID;
}

export default function TripDialog({
  open,
  trip,
  countryOptions,
  isDarkPhase = false,
  onSave,
  onDelete,
  onClose,
}: TripDialogProps) {
  const [draft, setDraft] = useState<Trip>(emptyTrip());
  const [draftImages, setDraftImages] = useState<DraftImage[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>(CUSTOM_CITY_ID);
  const [citySearch, setCitySearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadDraft() {
      if (trip) {
        setDraft({ ...trip, imageIds: [...(trip.imageIds ?? [])] });
        setSelectedCityId(resolveInitialCityKey(trip));

        const stored: DraftImage[] = [];
        for (const id of trip.imageIds ?? []) {
          const preview = await getImageObjectUrl(id);
          if (preview && !cancelled) stored.push({ kind: 'stored', id, preview });
        }
        if (!cancelled) setDraftImages(stored);
      } else {
        const next = emptyTrip();
        setDraft(next);
        setSelectedCityId(next.cityKey ?? CUSTOM_CITY_ID);
        setDraftImages([]);
      }
      setCitySearch('');
    }

    void loadDraft();

    return () => {
      cancelled = true;
    };
  }, [open, trip]);

  const cities = useMemo(() => getCitiesForCountry(draft.countryCode), [draft.countryCode]);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, citySearch]);

  const cityOptions = useMemo(() => {
    if (selectedCityId === CUSTOM_CITY_ID) return filteredCities;
    const selected = findCityById(selectedCityId);
    if (selected && !filteredCities.some((c) => c.id === selected.id)) {
      return [selected, ...filteredCities];
    }
    return filteredCities;
  }, [filteredCities, selectedCityId]);

  const isCustomCity = selectedCityId === CUSTOM_CITY_ID;

  if (!open) return null;

  const shellClass = isDarkPhase
    ? 'bg-[#121214] border-white/10 text-neutral-200'
    : 'bg-[#faf9f6] border-black/10 text-[#2c2c2a]';

  const labelClass = 'text-[9px] font-semibold uppercase tracking-widest opacity-50';
  const fieldClass = isDarkPhase
    ? 'w-full min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-neutral-200 outline-none focus:border-[#a58452]/50'
    : 'w-full min-w-0 rounded-lg border border-black/10 bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-[#a58452]/50';

  const sectionClass = `rounded-xl border p-4 flex flex-col gap-3 ${
    isDarkPhase ? 'border-white/8 bg-black/20' : 'border-black/6 bg-black/[0.02]'
  }`;

  const handleCountryChange = (countryCode: string) => {
    const city = getDefaultCityForCountry(countryCode);
    setCitySearch('');
    if (city) {
      setSelectedCityId(city.id);
      setDraft((d) => ({
        ...d,
        countryCode,
        ...cityToDraftFields(city),
      }));
    } else {
      setSelectedCityId(CUSTOM_CITY_ID);
      setDraft((d) => ({ ...d, countryCode, cityKey: undefined }));
    }
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    if (cityId === CUSTOM_CITY_ID) {
      setDraft((d) => ({ ...d, cityKey: undefined }));
      return;
    }
    const city = findCityById(cityId);
    if (city) {
      setDraft((d) => ({ ...d, ...cityToDraftFields(city) }));
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const blobs = await readImageBlobsFromFiles(files);
    const pending: DraftImage[] = blobs.map((blob) => ({
      kind: 'pending',
      blob,
      preview: URL.createObjectURL(blob),
    }));
    setDraftImages((prev) => [...prev, ...pending].slice(0, 12));
  };

  const removeDraftImage = (index: number) => {
    setDraftImages((prev) => {
      const removed = prev[index];
      if (removed?.kind === 'pending') {
        URL.revokeObjectURL(removed.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return;

    const keptIds = draftImages
      .filter((img): img is Extract<DraftImage, { kind: 'stored' }> => img.kind === 'stored')
      .map((img) => img.id);
    const add = draftImages
      .filter((img): img is Extract<DraftImage, { kind: 'pending' }> => img.kind === 'pending')
      .map((img) => img.blob);
    const originalIds = trip?.imageIds ?? [];
    const removeIds = originalIds.filter((id) => !keptIds.includes(id));

    onSave(
      {
        ...draft,
        name,
        description: draft.description.trim(),
        cityKey: isCustomCity ? undefined : selectedCityId,
        imageIds: keptIds,
      },
      { add, removeIds },
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className={`relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:rounded-2xl ${shellClass}`}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4 ${isDarkPhase ? 'border-white/10' : 'border-black/8'}`}
        >
          <div className="min-w-0">
            <h3 className="truncate text-lg font-light" style={{ fontFamily: 'var(--font-serif)' }}>
              {trip ? 'Edit Journey' : 'New Journey'}
            </h3>
            <p className="mt-0.5 text-[9px] uppercase tracking-widest opacity-50">Chronicle entry</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="flex flex-col gap-4">
            {/* Location */}
            <section className={sectionClass}>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#a58452]">
                <MapPin size={12} />
                Location
              </div>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Country</span>
                <select
                  value={draft.countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className={fieldClass}
                >
                  {countryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>City</span>
                {cities.length > 8 && (
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
                    />
                    <input
                      type="search"
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      placeholder="Search cities..."
                      className={`${fieldClass} pl-9`}
                    />
                  </div>
                )}
                <select
                  value={selectedCityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className={fieldClass}
                >
                  {cityOptions.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                      {city.isCapital ? ' (capital)' : ''}
                    </option>
                  ))}
                  <option value={CUSTOM_CITY_ID}>Custom location…</option>
                </select>
              </label>

              {isCustomCity ? (
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>Place name</span>
                  <input
                    required
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g. Small town, landmark, neighborhood"
                    className={fieldClass}
                  />
                </label>
              ) : (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${isDarkPhase ? 'bg-white/5 text-neutral-300' : 'bg-black/4 text-[#5c5c58]'}`}
                >
                  <span className="font-medium text-[#a58452]">{draft.name}</span>
                  <span className="mx-2 opacity-30">·</span>
                  <span className="font-mono text-xs opacity-70">
                    {draft.lat.toFixed(4)}°, {draft.lng.toFixed(4)}°
                  </span>
                </div>
              )}

              {isCustomCity && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className={labelClass}>Latitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={draft.lat}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, lat: parseFloat(e.target.value) || 0 }))
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className={labelClass}>Longitude</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={draft.lng}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, lng: parseFloat(e.target.value) || 0 }))
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
              )}

              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Pin style</span>
                <select
                  value={draft.material}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, material: e.target.value as Trip['material'] }))
                  }
                  className={fieldClass}
                >
                  <option value="brass">Brass</option>
                  <option value="copper">Copper</option>
                </select>
              </label>
            </section>

            {/* Duration */}
            <section className={sectionClass}>
              <span className={labelClass}>When</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[8px] uppercase tracking-widest opacity-40">From</span>
                  <select
                    value={draft.startMonth ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        startMonth: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    className={fieldClass}
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Year"
                    value={draft.startYear ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        startYear: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    className={fieldClass}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[8px] uppercase tracking-widest opacity-40">Until</span>
                  <select
                    value={draft.endMonth ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        endMonth: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    className={fieldClass}
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Year"
                    value={draft.endYear ?? ''}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        endYear: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      }))
                    }
                    className={fieldClass}
                  />
                </div>
              </div>
            </section>

            {/* Notes */}
            <section className={sectionClass}>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Notes</span>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Memories, architecture notes..."
                  className={`resize-none ${fieldClass}`}
                />
              </label>
            </section>

            {/* Photos */}
            <section className={sectionClass}>
              <span className={labelClass}>Photos (optional)</span>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
                }}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-5 transition-colors ${
                  dragOver
                    ? 'border-[#a58452] bg-[#a58452]/10'
                    : isDarkPhase
                      ? 'border-white/15 hover:border-white/25'
                      : 'border-black/15 hover:border-black/25'
                }`}
              >
                <Upload size={18} className="text-[#a58452] opacity-70" />
                <span className="text-[10px] uppercase tracking-widest opacity-50">
                  Drop photos or tap to browse
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) void handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>
              {draftImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {draftImages.map((img, i) => (
                    <div key={img.kind === 'stored' ? img.id : img.preview} className="relative aspect-square overflow-hidden rounded-lg">
                      <img src={img.preview} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeDraftImage(i)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <div
          className={`flex shrink-0 flex-wrap items-center gap-2 border-t px-5 py-4 ${isDarkPhase ? 'border-white/10' : 'border-black/8'}`}
        >
          {trip && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(trip.id);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] uppercase tracking-widest text-red-400 hover:bg-red-400/10"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!draft.name.trim()}
            className="rounded-full bg-[#a58452] px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-white hover:bg-[#b59563] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export function sortCountryOptions(codes: string[]) {
  return codes
    .map((code) => ({ code, name: getCountryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
