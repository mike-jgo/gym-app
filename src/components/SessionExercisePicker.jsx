import React, { useState } from 'react';

export default function SessionExercisePicker({ registry, sessionExerciseIds, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const normalized = search.toLowerCase().trim();
  const all = Object.values(registry);

  const filtered = all.filter(
    (e) => !sessionExerciseIds.has(e.id) && (!normalized || e.name.toLowerCase().includes(normalized))
  );

  const hasExactMatch = normalized && all.some((e) => e.name.toLowerCase().trim() === normalized);

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-end" onClick={onClose}>
      <div
        className="w-full max-h-[80vh] bg-surface rounded-t-card flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 text-[0.8rem] font-bold border-b border-line shrink-0">
          <span className="font-mono">ADD EXERCISE</span>
          <button className="text-muted text-base cursor-pointer bg-transparent border-none px-1" onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-line shrink-0">
          <input
            className="w-full bg-surface2 border border-line rounded-lg text-text font-sans text-[0.95rem] px-3 py-2.5 outline-none focus:border-muted box-border"
            placeholder="Search or type a custom name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 py-1.5 pb-3">
          {filtered.map((ex) => (
            <button
              key={ex.id}
              className="flex items-center justify-between w-full px-4 py-3 bg-transparent border-none text-text font-sans text-[0.95rem] text-left cursor-pointer hover:bg-surface2 transition-colors duration-100"
              onClick={() => onPick(ex)}
            >
              <span>{ex.name}</span>
            </button>
          ))}

          {normalized && !hasExactMatch && (
            <button
              className="flex items-center justify-between w-full px-4 py-3 bg-transparent border-none text-muted font-sans text-[0.95rem] text-left cursor-pointer hover:bg-surface2 transition-colors duration-100 border-t border-line mt-1"
              onClick={() => onPick({ id: null, name: search.trim() })}
            >
              <span>Add &ldquo;{search.trim()}&rdquo;</span>
              <span className="font-mono text-[0.65rem] text-muted border border-line rounded-[10px] px-[7px] py-[2px] shrink-0">NEW</span>
            </button>
          )}

          {!normalized && filtered.length === 0 && (
            <p className="font-mono text-center text-muted text-[0.8rem] px-4 py-6">
              All exercises already in session.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
