import React, { useState } from 'react';
import { formatDateTime, formatDuration } from '../utils/date';
import StatsView from './StatsView';

const ACCENT = {
  a: 'var(--accent-a)', b: 'var(--accent-b)', c: 'var(--accent-c)',
  d: 'var(--accent-d)', e: 'var(--accent-e)', f: 'var(--accent-f)',
};

export default function HistoryScreen({ onBack, sessions, loading }) {
  const [tab, setTab] = useState('log');

  return (
    <div className="flex flex-col gap-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2">
        <button className="text-muted text-xl bg-transparent border-none cursor-pointer pr-2 hover:text-text" onClick={onBack} aria-label="Back to home">←</button>
        <h1 className="font-mono text-2xl font-extrabold tracking-tight">HISTORY</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-[3px] bg-surface border border-line rounded-lg w-fit mb-1">
        {['log', 'stats'].map((t) => (
          <button
            key={t}
            className={`font-mono text-[0.72rem] font-bold tracking-widest px-4 py-1.5 rounded-md border-none cursor-pointer transition-colors ${
              tab === t ? 'bg-surface2 text-text' : 'bg-transparent text-muted'
            }`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {loading && (
        <p className="font-mono text-muted text-sm animate-pulse-slow">Loading…</p>
      )}

      {!loading && tab === 'stats' && <StatsView sessions={sessions} />}

      {!loading && tab === 'log' && (
        <>
          {sessions.length === 0 && (
            <p className="text-muted text-sm">No sessions recorded yet.</p>
          )}
          <div className="flex flex-col gap-3 pb-5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-surface rounded-xl border-l-4 px-4 py-3.5 flex flex-col gap-2.5"
                style={{ borderLeftColor: ACCENT[session.workoutColor] ?? ACCENT.a }}
              >
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-[0.85rem] font-bold text-text">
                    {formatDateTime(session.date)}
                  </span>
                  <span
                    className="font-mono text-[0.75rem] font-bold"
                    style={{ color: ACCENT[session.workoutColor] ?? ACCENT.a }}
                  >
                    {session.workout}
                  </span>
                </div>
                <div className="flex gap-3 font-mono text-[0.7rem] text-muted">
                  <span>BW {session.bodyweight} kg</span>
                  {session.duration > 0 && <span>{formatDuration(session.duration)}</span>}
                </div>
                <div className="flex flex-col gap-2">
                  {session.exercises.map((ex) => (
                    <div key={ex.id} className="flex flex-col gap-1">
                      <span className="text-[0.8rem] font-semibold text-text">{ex.name}</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {ex.sets.map((s) => (
                          <span key={s.set} className="font-mono text-[0.7rem] text-muted bg-surface2 px-2 py-[2px] rounded">
                            {s.weight}x{s.reps}
                            {Number.isFinite(parseFloat(s.rpe)) && ` @${parseFloat(s.rpe)}`}
                            {Number.isFinite(parseFloat(s.rir)) && ` (RIR ${parseFloat(s.rir)})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
