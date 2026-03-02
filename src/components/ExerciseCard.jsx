import React, { useMemo } from 'react';
import { calc1RM } from '../utils/calc';
import { saveField, loadField } from '../utils/storage';
import { formatDate } from '../utils/date';
import './ExerciseCard.css';

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

  // Compute best e1RM across all current sets
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
      return;
    }

    handleInput(set, 'rpe', (10 - n).toFixed(1).replace('.0', ''));
  };

  const formatSetSummary = (s, i) => {
    const rpe = Number.isFinite(parseFloat(s.rpe)) ? ` @${parseFloat(s.rpe).toFixed(1).replace('.0', '')}` : '';
    const rir = Number.isFinite(parseFloat(s.rir)) ? ` (RIR ${parseFloat(s.rir).toFixed(1).replace('.0', '')})` : '';
    return (
      <span key={i}>
        <em>S{i + 1}</em> {s.w}x{s.r}{rpe}{rir}
        {i < lastLift.sets.length - 1 ? '  ' : ''}
      </span>
    );
  };

  // Last lift display
  let lastLiftEl = null;
  if (lastLift?.sets?.length) {
    lastLiftEl = (
      <div className="last-lift mono">
        LAST: {lastLift.sets.map((s, i) => formatSetSummary(s, i))}
        {lastLift.date && <span className="last-date">{formatDate(lastLift.date)}</span>}
      </div>
    );
  }

  let pbEl = null;
  if (personalBest && personalBest.best1RM > 0) {
    pbEl = (
      <div className="pb-lift mono">
        PB: <em>e1RM</em> {personalBest.best1RM}
        {personalBest.best1RMDate && <span className="pb-date">{formatDate(personalBest.best1RMDate)}</span>}
        <span className="pb-sep">|</span>
        <em>WEIGHT</em> {personalBest.bestWeight}x{personalBest.bestWeightReps}
        {personalBest.bestWeightDate && <span className="pb-date">{formatDate(personalBest.bestWeightDate)}</span>}
      </div>
    );
  }

  return (
    <div className={`exercise-card workout-${workoutColor}`}>
      <div className="ex-header">
        <div className="ex-name">{exercise.name}</div>
        <div className="ex-1rm mono">
          e1RM {best1RM > 0 ? <strong>{best1RM.toFixed(1)}</strong> : '—'}
        </div>
      </div>

      {lastLiftEl}
      {pbEl}

      <div className="sets-grid">
        {setNumbers.map((s) => (
          <React.Fragment key={s}>
            <span className="set-label mono">S{s}</span>
            <input
              className="set-input mono"
              inputMode="decimal"
              placeholder="kg"
              defaultValue={loadField(exercise.id, s, 'w')}
              onChange={(e) => handleInput(s, 'w', e.target.value)}
            />
            <input
              className="set-input mono"
              inputMode="decimal"
              placeholder="reps"
              defaultValue={loadField(exercise.id, s, 'r')}
              onChange={(e) => handleInput(s, 'r', e.target.value)}
            />
            <input
              key={`effort-${exercise.id}-${s}-${effortMode}`}
              className="set-input mono set-input-effort"
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
