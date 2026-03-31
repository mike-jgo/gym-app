import React from 'react';

export default function EffortModeToggle({ effortMode, onModeChange, workoutColor }) {
  return (
    <div
      className="inline-flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-full border border-line bg-surface font-mono text-[0.7rem] text-muted"
      style={{ '--accent': `var(--accent-${workoutColor})`, '--accent-dim': `var(--accent-${workoutColor}-dim)` }}
    >
      <span>INPUT</span>
      {['rpe', 'rir'].map((mode) => (
        <button
          key={mode}
          className={`border rounded-full px-2.5 py-1 font-mono text-[0.72rem] cursor-pointer transition-colors ${
            effortMode === mode
              ? 'font-bold border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]'
              : 'border-line bg-surface2 text-muted'
          }`}
          onClick={() => onModeChange(mode)}
        >
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
