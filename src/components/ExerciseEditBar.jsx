import React from 'react';

export default function ExerciseEditBar({ exercise, isFirst, isLast, onRemove, onUpdateSets, onMove }) {
  const btnBase = 'w-7 h-7 rounded-md border-[1.5px] border-line bg-surface2 text-text text-base cursor-pointer flex items-center justify-center transition-colors hover:enabled:border-muted disabled:opacity-30 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface border border-line rounded-t-card -mb-[2px]">
      <span className="text-[0.78rem] font-semibold text-muted flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
        {exercise.name}
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button className={`${btnBase} text-[0.7rem]`} onClick={() => onMove(exercise.id, 'up')} disabled={isFirst}>▲</button>
        <button className={`${btnBase} text-[0.7rem]`} onClick={() => onMove(exercise.id, 'down')} disabled={isLast}>▼</button>
        <button
          className={btnBase}
          onClick={() => onUpdateSets(exercise.id, -1)}
          disabled={exercise.sets <= 1}
        >−</button>
        <span className="font-mono text-[0.75rem] text-muted min-w-[42px] text-center">{exercise.sets} sets</span>
        <button
          className={btnBase}
          onClick={() => onUpdateSets(exercise.id, 1)}
          disabled={exercise.sets >= 10}
        >+</button>
        <button
          className="px-2 py-1 rounded-md border-[1.5px] border-line bg-transparent text-red text-[0.8rem] cursor-pointer transition-all hover:bg-[rgba(255,74,106,0.1)] hover:border-red"
          onClick={() => onRemove(exercise.id)}
        >✕</button>
      </div>
    </div>
  );
}
