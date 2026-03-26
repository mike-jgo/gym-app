import React from 'react';

export default function FooterActions({ workoutColor, onComplete, onExport, onClear, saving }) {
  const accentBtn = [
    'flex-1 py-4 rounded-card font-sans font-bold text-[0.95rem] border-2 cursor-pointer active:scale-[0.97] transition-all',
    'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]',
  ].join(' ');

  return (
    <div
      className="flex gap-2.5 mt-6 pb-5"
      style={{
        '--accent':     `var(--accent-${workoutColor})`,
        '--accent-dim': `var(--accent-${workoutColor}-dim)`,
      }}
    >
      <button
        className={`${accentBtn} ${saving ? 'animate-pulse-btn cursor-not-allowed opacity-70' : ''}`}
        onClick={onComplete}
        disabled={saving}
      >
        {saving ? 'SAVING…' : 'COMPLETE'}
      </button>
      <button className={accentBtn} onClick={onExport}>EXPORT</button>
      <button
        className="flex-1 py-4 rounded-card font-sans font-bold text-[0.95rem] border-2 cursor-pointer active:scale-[0.97] transition-all border-red text-red bg-transparent"
        onClick={onClear}
      >
        CLEAR
      </button>
    </div>
  );
}
