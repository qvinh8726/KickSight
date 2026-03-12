"use client";

import { useState } from "react";

interface FiltersProps {
  onFilter: (filters: {
    competition: string;
    minEv: number;
    dateFrom: string;
    dateTo: string;
  }) => void;
}

export default function Filters({ onFilter }: FiltersProps) {
  const [competition, setCompetition] = useState("");
  const [minEv, setMinEv] = useState(3);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const apply = () => {
    onFilter({
      competition,
      minEv: minEv / 100,
      dateFrom,
      dateTo,
    });
  };

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="stat-label mb-1 block">Competition</label>
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="FIFA World Cup">FIFA World Cup</option>
            <option value="UEFA Euro">UEFA Euro</option>
            <option value="Copa America">Copa America</option>
            <option value="FIFA World Cup Qualification">WC Qualification</option>
            <option value="UEFA Nations League">Nations League</option>
          </select>
        </div>
        <div>
          <label className="stat-label mb-1 block">Min EV %</label>
          <input
            type="number"
            value={minEv}
            onChange={(e) => setMinEv(Number(e.target.value))}
            min={0}
            max={50}
            step={0.5}
            className="w-20 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="stat-label mb-1 block">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="stat-label mb-1 block">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          />
        </div>
        <button
          onClick={apply}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
