import React, { useState } from 'react';

interface DiscoveryFiltersProps {
  minAge: number;
  maxAge: number;
  location: string;
  distance: number;
  interests: string[];
  allInterests: string[];
  onChange: (filters: {
    minAge: number;
    maxAge: number;
    location: string;
    distance: number;
    interests: string[];
  }) => void;
}

const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({ minAge, maxAge, location, distance, interests, allInterests, onChange }) => {
  const [localMinAge, setLocalMinAge] = useState(minAge);
  const [localMaxAge, setLocalMaxAge] = useState(maxAge);
  const [localLocation, setLocalLocation] = useState(location);
  const [localDistance, setLocalDistance] = useState(distance);
  const [localInterests, setLocalInterests] = useState<string[]>(interests);

  const handleApply = () => {
    onChange({
      minAge: localMinAge,
      maxAge: localMaxAge,
      location: localLocation,
      distance: localDistance,
      interests: localInterests,
    });
  };

  const toggleInterest = (interest: string) => {
    setLocalInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  return (
    <div className="bg-white border-b px-6 py-4 flex flex-col gap-4">
      <div className="flex gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Age Range</label>
          <div className="flex gap-2 items-center">
            <input type="number" min={18} max={localMaxAge} value={localMinAge} onChange={e => setLocalMinAge(Number(e.target.value))} className="w-14 px-2 py-1 border rounded" />
            <span>-</span>
            <input type="number" min={localMinAge} max={80} value={localMaxAge} onChange={e => setLocalMaxAge(Number(e.target.value))} className="w-14 px-2 py-1 border rounded" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Location</label>
          <input type="text" value={localLocation} onChange={e => setLocalLocation(e.target.value)} className="px-2 py-1 border rounded w-32" placeholder="City or Zip" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Distance (km)</label>
          <input type="number" min={1} max={500} value={localDistance} onChange={e => setLocalDistance(Number(e.target.value))} className="w-20 px-2 py-1 border rounded" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 mb-2">Interests</label>
        <div className="flex flex-wrap gap-2">
          {allInterests.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => toggleInterest(interest)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${localInterests.includes(interest) ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 text-gray-700 border-gray-200'}`}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleApply} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition">Apply Filters</button>
      </div>
    </div>
  );
};

export default DiscoveryFilters;
