import React, { useMemo } from 'react';
import { calc1RM } from '../utils/calc';
import { saveField, loadField } from '../utils/storage';
import './ExerciseCard.css';

export default function ExerciseCard({ exercise, lastLift, workoutColor, fieldVersion, onFieldChange }) {
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

  // Last lift display
  let lastLiftEl = null;
  if (lastLift?.sets?.length) {
    const summary = lastLift.sets
      .map((s, i) => `S${i + 1} ${s.w}×${s.r}`)
      .join('  ');
    lastLiftEl = (
      <div className="last-lift mono">
        LAST: {lastLift.sets.map((s, i) => (
          <span key={i}>
            <em>S{i + 1}</em> {s.w}×{s.r}
            {i < lastLift.sets.length - 1 ? '  ' : ''}
          </span>
        ))}
        {lastLift.date && <span className="last-date">{lastLift.date}</span>}
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
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
