import React from 'react';
import { syncDotClass } from '../utils/ui';

const ACCENT = {
  a: 'var(--accent-a)', b: 'var(--accent-b)', c: 'var(--accent-c)',
  d: 'var(--accent-d)', e: 'var(--accent-e)', f: 'var(--accent-f)',
};

export default function HomeScreen({ workouts, onStart, onManage, onHistory, onSignOut, syncStatus }) {
  return (
    <div className="flex flex-col gap-4 pt-3">
      {/* Title + sync dot */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="font-mono text-2xl font-extrabold tracking-tight">FITLOG</h1>
        <div className={`w-2 h-2 rounded-full shrink-0 ${syncDotClass(syncStatus)}`}
          title={`Supabase: ${syncStatus}`} />
      </div>

      {/* Workout cards */}
      <div className="flex flex-col gap-2.5">
        {workouts.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between px-4 py-[14px] bg-surface rounded-xl border-l-4"
            style={{ borderLeftColor: ACCENT[w.color] ?? ACCENT.a }}
          >
            <span
              className="font-mono text-base font-bold"
              style={{ color: ACCENT[w.color] ?? ACCENT.a }}
            >
              {w.label}
            </span>
            <button
              className="text-xs font-bold tracking-wide px-[18px] py-2 rounded-lg border-none cursor-pointer text-bg"
              style={{ background: ACCENT[w.color] ?? ACCENT.a }}
              onClick={() => onStart(w.id)}
            >
              START
            </button>
          </div>
        ))}
      </div>

      {/* Footer buttons */}
      <div className="flex flex-col items-center gap-2 mt-2">
        <button
          className="font-mono text-xs font-bold tracking-widest text-muted bg-transparent border border-line px-5 py-2 rounded-full cursor-pointer mt-2 hover:text-text hover:border-muted"
          onClick={onManage}
        >
          MANAGE ROUTINES
        </button>
        <button
          className="font-mono text-xs font-bold tracking-widest text-muted bg-transparent border-none px-2 py-1 cursor-pointer hover:text-text"
          onClick={onHistory}
        >
          VIEW HISTORY
        </button>
        <button
          className="font-mono text-[0.7rem] font-bold tracking-widest text-muted bg-transparent border-none px-2 py-1 cursor-pointer opacity-50 hover:opacity-100 hover:text-text"
          onClick={onSignOut}
        >
          SIGN OUT
        </button>
      </div>
    </div>
  );
}

