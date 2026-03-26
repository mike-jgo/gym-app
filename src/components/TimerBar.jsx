import React from 'react';

export default function TimerBar({ display, percent, running, finished, onToggle, workoutColor }) {
  return (
    <div
      className="timer-fill relative overflow-hidden flex items-center justify-between bg-surface border border-line rounded-card px-4 py-[14px] mb-5"
      style={{
        '--timer-pct': `${percent}%`,
        '--accent-dim': `var(--accent-${workoutColor}-dim)`,
      }}
    >
      {/* All children must be above the ::before fill */}
      <span className={`relative z-10 font-mono text-[1.6rem] font-bold ${finished ? 'text-green animate-pulse-slow' : ''}`}>
        {display}
      </span>
      <button
        className="relative z-10 px-5 py-2.5 rounded-[10px] font-sans font-semibold text-[0.9rem] border-none cursor-pointer active:scale-95 transition-transform"
        style={running
          ? { background: 'var(--color-red)', color: '#fff' }
          : { background: `var(--accent-${workoutColor})`, color: 'var(--color-bg)' }
        }
        onClick={onToggle}
      >
        {running ? 'STOP' : 'REST'}
      </button>
    </div>
  );
}
