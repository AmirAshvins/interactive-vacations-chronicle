import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { findCityById, getCitiesForCountry } from '../data/worldCities';
import { sortCountryOptions } from './TripDialog';

interface HomeCityPickerProps {
  homeCityKey: string;
  countryCodes: string[];
  isDarkPhase?: boolean;
  onHomeCityChange: (cityKey: string) => void;
}

export default function HomeCityPicker({
  homeCityKey,
  countryCodes,
  isDarkPhase = false,
  onHomeCityChange,
}: HomeCityPickerProps) {
  const homeCity = findCityById(homeCityKey);
  const [countryCode, setCountryCode] = useState(homeCity?.countryCode ?? 'ca');
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    const city = findCityById(homeCityKey);
    if (city) setCountryCode(city.countryCode);
  }, [homeCityKey]);

  const countryOptions = sortCountryOptions(countryCodes.length ? countryCodes : ['ca', 'us', 'ir']);
  const cities = getCitiesForCountry(countryCode);
  const filteredCities = citySearch.trim()
    ? cities.filter((c) => c.name.toLowerCase().includes(citySearch.trim().toLowerCase()))
    : cities;

  const fieldClass = isDarkPhase
    ? 'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-[#a58452]/50'
    : 'w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-[#2c2c2a] outline-none focus:border-[#a58452]/50';

  const labelClass = 'text-[9px] uppercase tracking-widest font-semibold opacity-50';

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Country</span>
        <select
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
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
        <span className={labelClass}>Home city</span>
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
          value={filteredCities.some((c) => c.id === homeCityKey) ? homeCityKey : ''}
          onChange={(e) => {
            if (e.target.value) onHomeCityChange(e.target.value);
          }}
          className={fieldClass}
        >
          {!filteredCities.some((c) => c.id === homeCityKey) && homeCity && (
            <option value={homeCity.id}>{homeCity.name}</option>
          )}
          {filteredCities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
              {city.isCapital ? ' (capital)' : ''}
            </option>
          ))}
        </select>
      </label>

      {homeCity && (
        <div className="flex flex-col gap-1 border-t pt-3 text-[9px] font-mono opacity-50 border-black/5 dark:border-white/5">
          <div className="flex justify-between">
            <span>LATITUDE</span>
            <span>{homeCity.lat.toFixed(4)}°</span>
          </div>
          <div className="flex justify-between">
            <span>LONGITUDE</span>
            <span>{homeCity.lng.toFixed(4)}°</span>
          </div>
        </div>
      )}
    </div>
  );
}
