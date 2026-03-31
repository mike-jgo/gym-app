import React, { useState } from 'react';
import { syncDotClass } from '../utils/ui';

const ACCENT = {
  a: 'var(--accent-a)', b: 'var(--accent-b)', c: 'var(--accent-c)',
  d: 'var(--accent-d)', e: 'var(--accent-e)', f: 'var(--accent-f)',
};

export default function Header({ workoutColor, workoutLabel, syncStatus, bodyweight, onBodyweightChange, onBack, sessionElapsed, onEditToggle, editMode }) {
  const [editing, setEditing] = useState(false);

  const commit = (e) => {
    onBodyweightChange(e.target.value);
    setEditing(false);
  };

  return (
    <div className="flex items-center justify-between py-3 pb-5">
      {/* Left */}
      <div className="flex items-center gap-1">
        {onBack && (
          <button className="text-muted text-xl cursor-pointer pr-2 bg-transparent border-none leading-none hover:text-text" onClick={onBack} aria-label="Back to home">
            ←
          </button>
        )}
        <h1 className="font-mono text-2xl font-extrabold tracking-tight">
          FITLOG{' '}
          <span style={{ color: ACCENT[workoutColor] ?? ACCENT.a }}>{workoutLabel}</span>
        </h1>
        {onEditToggle && (
          <button
            className={`font-mono text-[0.65rem] font-bold tracking-wide px-[9px] py-[3px] rounded-full border cursor-pointer ml-1 ${
              editMode
                ? 'bg-surface2 border-muted text-text'
                : 'bg-surface border-line text-muted hover:border-muted hover:text-text'
            }`}
            onClick={onEditToggle}
          >
            {editMode ? 'DONE' : 'EDIT'}
          </button>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {sessionElapsed && (
          <span className="font-mono text-[0.7rem] text-muted tracking-wide">{sessionElapsed}</span>
        )}
        {editing ? (
          <input
            className="font-mono text-[0.7rem] text-text bg-surface2 border border-muted rounded-full px-[10px] py-1 w-[90px] text-center outline-none focus:border-[var(--accent-a)]"
            defaultValue={bodyweight}
            inputMode="decimal"
            autoFocus
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit(e)}
          />
        ) : (
          <button
            className="font-mono text-[0.7rem] text-muted bg-surface border border-line px-[10px] py-1 rounded-full cursor-pointer hover:border-muted hover:text-text"
            onClick={() => setEditing(true)}
          >
            BW {bodyweight} kg
          </button>
        )}
        {/* Sync dot */}
        <div
          className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-300 ${syncDotClass(syncStatus)}`}
          title={`Supabase: ${syncStatus}`}
        />
      </div>
    </div>
  );
}

