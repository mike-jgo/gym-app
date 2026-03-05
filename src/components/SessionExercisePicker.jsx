import React, { useState } from 'react';
import './SessionExercisePicker.css';

export default function SessionExercisePicker({ registry, sessionExerciseIds, onPick, onClose }) {
  const [search, setSearch] = useState('');
  const normalized = search.toLowerCase().trim();
  const all = Object.values(registry);

  const filtered = all.filter(
    (e) => !sessionExerciseIds.has(e.id) && (!normalized || e.name.toLowerCase().includes(normalized))
  );

  const hasExactMatch = normalized && all.some((e) => e.name.toLowerCase().trim() === normalized);

  return (
    <div className="sxp-backdrop" onClick={onClose}>
      <div className="sxp-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sxp-header">
          <span className="mono">ADD EXERCISE</span>
          <button className="sxp-close" onClick={onClose}>✕</button>
        </div>
        <div className="sxp-search">
          <input
            className="sxp-input"
            placeholder="Search or type a custom name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="sxp-list">
          {filtered.map((ex) => (
            <button key={ex.id} className="sxp-item" onClick={() => onPick(ex)}>
              <span className="sxp-name">{ex.name}</span>
            </button>
          ))}
          {normalized && !hasExactMatch && (
            <button className="sxp-item sxp-custom" onClick={() => onPick({ id: null, name: search.trim() })}>
              <span className="sxp-name">Add "{search.trim()}"</span>
              <span className="sxp-tag mono">NEW</span>
            </button>
          )}
          {!normalized && filtered.length === 0 && (
            <p className="sxp-empty mono">All exercises already in session.</p>
          )}
        </div>
      </div>
    </div>
  );
}
