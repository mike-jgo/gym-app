import React, { useMemo } from 'react';
import { calc1RM } from '../utils/calc';
import { saveField, loadField } from '../utils/storage';
import { formatDate } from '../utils/date';

export default function ExerciseCard({
  exercise,
  lastLift,
  personalBest,
  workoutColor,
  fieldVersion,
  effortMode,
  onFieldChange,
}) {
  const setNumbers = useMemo(
    () => Array.from({ length: exercise.sets }, (_, i) => i + 1),
    [exercise.sets]
  );

  const best1RM = useMemo(() => {
    let best = 0;
    for (const s of setNumbers) {
      const w = parseFloat(loadField(exercise.id, s, 'w')) || 0;
      const r = parseInt(loadField(exercise.id, s, 'r')) || 0;
      const rm = calc1RM(w, r);
      if (rm > best) best = rm;
    }
    return best;
  }, [exercise.id, setNumbers, fieldVersion]);

  const handleInput = (set, field, value) => {
    saveField(exercise.id, set, field, value);
    if (onFieldChange) onFieldChange();
  };

  const handleEffortInput = (set, value) => {
    handleInput(set, effortMode, value);
    if (value === '') {
      handleInput(set, effortMode === 'rpe' ? 'rir' : 'rpe', '');
      return;
    }
    const n = parseFloat(value);
    if (!Number.isFinite(n)) return;
    if (effortMode === 'rpe') {
      handleInput(set, 'rir', (10 - n).toFixed(1).replace('.0', ''));
    } else {
      handleInput(set, 'rpe', (10 - n).toFixed(1).replace('.0', ''));
    }
  };

  const formatSetSummary = (s, i) => {
    const rpe = Number.isFinite(parseFloat(s.rpe)) ? ` @${parseFloat(s.rpe).toFixed(1).replace('.0', '')}` : '';
    const rir = Number.isFinite(parseFloat(s.rir)) ? ` (RIR ${parseFloat(s.rir).toFixed(1).replace('.0', '')})` : '';
    return (
      <span key={i}>
        <em className="not-italic text-[var(--accent)]">S{i + 1}</em>{' '}
        {s.w}x{s.r}{rpe}{rir}
        {i < lastLift.sets.length - 1 ? '  ' : ''}
      </span>
    );
  };

  const infoBox = 'font-mono text-[0.78rem] text-muted mb-3 px-2.5 py-1.5 bg-surface2 rounded-lg';

  return (
    <div
      className="exercise-card bg-surface border border-line rounded-card p-[18px] mb-3.5 transition-colors duration-300"
      style={{
        '--accent':     `var(--accent-${workoutColor})`,
        '--accent-dim': `var(--accent-${workoutColor}-dim)`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3.5">
        <div className="font-bold text-[1.05rem] leading-snug flex-1 pr-2.5">{exercise.name}</div>
        <div className="font-mono text-[0.75rem] text-muted bg-surface2 rounded-lg px-2.5 py-1 whitespace-nowrap">
          e1RM {best1RM > 0 ? <strong className="text-yellow">{best1RM.toFixed(1)}</strong> : '—'}
        </div>
      </div>

      {/* Last lift */}
      {lastLift?.sets?.length > 0 && (
        <div className={infoBox}>
          LAST: {lastLift.sets.map((s, i) => formatSetSummary(s, i))}
          {lastLift.date && (
            <span className="opacity-50 ml-1.5">{formatDate(lastLift.date)}</span>
          )}
        </div>
      )}

      {/* Personal best */}
      {personalBest?.best1RM > 0 && (
        <div className={`${infoBox} text-[0.74rem]`}>
          PB:{' '}
          <em className="not-italic text-yellow">e1RM</em>{' '}
          {personalBest.best1RM}
          {personalBest.best1RMDate && (
            <span className="opacity-50 ml-1.5">{formatDate(personalBest.best1RMDate)}</span>
          )}
          <span className="opacity-50 mx-2">|</span>
          <em className="not-italic text-yellow">WEIGHT</em>{' '}
          {personalBest.bestWeight}x{personalBest.bestWeightReps}
          {personalBest.bestWeightDate && (
            <span className="opacity-50 ml-1.5">{formatDate(personalBest.bestWeightDate)}</span>
          )}
        </div>
      )}

      {/* Sets grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'auto 1fr 1fr 1fr' }}>
        {setNumbers.map((s) => (
          <React.Fragment key={s}>
            <span className="font-mono text-[0.75rem] text-muted font-semibold self-center">S{s}</span>
            <input
              className="w-full py-3 px-2.5 rounded-[10px] border-[1.5px] border-line bg-surface2 text-text font-mono text-[1.1rem] font-semibold text-center transition-colors duration-200 appearance-none outline-none focus:border-[var(--accent)] focus:bg-[var(--accent-dim)] placeholder:text-muted placeholder:font-normal placeholder:text-xs"
              inputMode="decimal"
              placeholder="kg"
              defaultValue={loadField(exercise.id, s, 'w')}
              onChange={(e) => handleInput(s, 'w', e.target.value)}
            />
            <input
              className="w-full py-3 px-2.5 rounded-[10px] border-[1.5px] border-line bg-surface2 text-text font-mono text-[1.1rem] font-semibold text-center transition-colors duration-200 appearance-none outline-none focus:border-[var(--accent)] focus:bg-[var(--accent-dim)] placeholder:text-muted placeholder:font-normal placeholder:text-xs"
              inputMode="decimal"
              placeholder="reps"
              defaultValue={loadField(exercise.id, s, 'r')}
              onChange={(e) => handleInput(s, 'r', e.target.value)}
            />
            <input
              key={`effort-${exercise.id}-${s}-${effortMode}`}
              className="w-full py-3 px-2.5 rounded-[10px] border-[1.5px] border-line bg-surface2 text-text font-mono text-[1rem] font-semibold text-center transition-colors duration-200 appearance-none outline-none focus:border-[var(--accent)] focus:bg-[var(--accent-dim)] placeholder:text-muted placeholder:font-normal placeholder:text-xs"
              inputMode="decimal"
              min={effortMode === 'rpe' ? '6' : '0'}
              max={effortMode === 'rpe' ? '10' : '4'}
              step="0.5"
              placeholder={effortMode.toUpperCase()}
              defaultValue={loadField(exercise.id, s, effortMode)}
              onChange={(e) => handleEffortInput(s, e.target.value)}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
