import React from 'react';

const ACCENT = {
  a: 'var(--accent-a)', b: 'var(--accent-b)', c: 'var(--accent-c)',
  d: 'var(--accent-d)', e: 'var(--accent-e)', f: 'var(--accent-f)',
};
const ACCENT_DIM = {
  a: 'var(--accent-a-dim)', b: 'var(--accent-b-dim)', c: 'var(--accent-c-dim)',
  d: 'var(--accent-d-dim)', e: 'var(--accent-e-dim)', f: 'var(--accent-f-dim)',
};

export default function WorkoutSelector({ workouts, currentId, onSelect, onManage }) {
  return (
    <div className="flex gap-2 mb-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {workouts.map((w) => (
        <button
          key={w.id}
          className="shrink-0 px-[18px] py-2.5 rounded-full font-sans text-[0.9rem] font-bold border-2 cursor-pointer transition-all whitespace-nowrap"
          style={currentId === w.id
            ? { borderColor: ACCENT[w.color], background: ACCENT_DIM[w.color], color: ACCENT[w.color] }
            : { borderColor: 'var(--color-line)', background: 'var(--color-surface)', color: 'var(--color-muted)' }
          }
          onClick={() => onSelect(w.id)}
        >
          {w.label}
        </button>
      ))}
      <button
        className="shrink-0 ml-auto px-[18px] py-2.5 rounded-full font-sans text-[0.8rem] font-bold border-2 border-line bg-surface text-muted cursor-pointer hover:border-muted hover:text-text transition-all whitespace-nowrap"
        onClick={onManage}
      >
        MANAGE
      </button>
    </div>
  );
}
