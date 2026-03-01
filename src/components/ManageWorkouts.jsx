import React, { useState } from 'react';
import { PRESET_EXERCISES } from '../utils/workouts';
import { generateExerciseId, nextAvailableColor } from '../utils/config';
import './ManageWorkouts.css';

const COLORS = ['a', 'b', 'c', 'd', 'e', 'f'];
const MAX_WORKOUTS = 6;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default function ManageWorkouts({ config, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => deepClone(config));
  const [selectedId, setSelectedId] = useState(draft.workouts[0]?.id ?? null);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedWorkout = draft.workouts.find((w) => w.id === selectedId);

  // ---- Workout mutations ----

  const addWorkout = () => {
    if (draft.workouts.length >= MAX_WORKOUTS) return;
    const usedColors = draft.workouts.map((w) => w.color);
    const color = nextAvailableColor(usedColors);
    const id = `workout_${Date.now().toString(36)}`;
    const newWorkout = { id, label: 'New', color, exercises: [] };
    const updated = { ...draft, workouts: [...draft.workouts, newWorkout] };
    setDraft(updated);
    setSelectedId(id);
  };

  const deleteWorkout = (id) => {
    if (draft.workouts.length <= 1) return;
    if (!confirm('Delete this workout?')) return;
    const updated = { ...draft, workouts: draft.workouts.filter((w) => w.id !== id) };
    setDraft(updated);
    if (selectedId === id) setSelectedId(updated.workouts[0]?.id ?? null);
  };

  const renameWorkout = (id, label) => {
    setDraft({
      ...draft,
      workouts: draft.workouts.map((w) => w.id === id ? { ...w, label } : w),
    });
  };

  const changeWorkoutColor = (id, color) => {
    setDraft({
      ...draft,
      workouts: draft.workouts.map((w) => w.id === id ? { ...w, color } : w),
    });
  };

  // ---- Exercise mutations ----

  const updateExercises = (workoutId, updater) => {
    setDraft({
      ...draft,
      workouts: draft.workouts.map((w) =>
        w.id === workoutId ? { ...w, exercises: updater(w.exercises) } : w
      ),
    });
  };

  const addPresetExercise = (preset) => {
    if (!selectedId) return;
    updateExercises(selectedId, (exs) => {
      if (exs.find((e) => e.id === preset.id)) return exs;
      return [...exs, { ...preset }];
    });
    setShowPresetPicker(false);
  };

  const addCustomExercise = () => {
    if (!selectedId) return;
    const name = prompt('Exercise name:');
    if (!name?.trim()) return;
    const id = generateExerciseId(name.trim());
    updateExercises(selectedId, (exs) => [
      ...exs,
      { id, name: name.trim(), sets: 3 },
    ]);
  };

  const removeExercise = (workoutId, exId) => {
    updateExercises(workoutId, (exs) => exs.filter((e) => e.id !== exId));
  };

  const updateExerciseSets = (workoutId, exId, delta) => {
    updateExercises(workoutId, (exs) =>
      exs.map((e) => e.id === exId ? { ...e, sets: Math.max(1, Math.min(10, e.sets + delta)) } : e)
    );
  };

  const renameExercise = (workoutId, exId, name) => {
    updateExercises(workoutId, (exs) =>
      exs.map((e) => e.id === exId ? { ...e, name } : e)
    );
  };

  const moveExercise = (workoutId, exId, dir) => {
    updateExercises(workoutId, (exs) => {
      const idx = exs.findIndex((e) => e.id === exId);
      if (idx < 0) return exs;
      const next = dir === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= exs.length) return exs;
      const arr = [...exs];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    onSave(draft);
  };

  // ---- Preset Picker ----

  const alreadyAdded = new Set(selectedWorkout?.exercises.map((e) => e.id) ?? []);

  return (
    <div className="manage-overlay">
      {/* Top bar */}
      <div className="manage-topbar">
        <span className="manage-title mono">MANAGE WORKOUTS</span>
        <div className="manage-topbar-actions">
          <button className="manage-btn save-btn" onClick={handleSave} disabled={saving}>
            {saving ? '…' : 'SAVE'}
          </button>
          <button className="manage-btn cancel-btn" onClick={onCancel}>CANCEL</button>
        </div>
      </div>

      {/* Workout tabs */}
      <div className="manage-tabs">
        {draft.workouts.map((w) => (
          <button
            key={w.id}
            className={`manage-tab${selectedId === w.id ? ` active accent-${w.color}` : ''}`}
            onClick={() => setSelectedId(w.id)}
          >
            {w.label}
          </button>
        ))}
        <button
          className="manage-tab add-tab"
          onClick={addWorkout}
          disabled={draft.workouts.length >= MAX_WORKOUTS}
        >
          + ADD
        </button>
      </div>

      {selectedWorkout && (
        <div className="manage-body">
          {/* Workout name + color */}
          <div className="manage-workout-meta">
            <div className="meta-row">
              <label className="meta-label mono">NAME</label>
              <input
                className="meta-input"
                value={selectedWorkout.label}
                onChange={(e) => renameWorkout(selectedWorkout.id, e.target.value)}
                maxLength={20}
              />
              {draft.workouts.length > 1 && (
                <button
                  className="delete-workout-btn"
                  onClick={() => deleteWorkout(selectedWorkout.id)}
                  title="Delete workout"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="meta-row">
              <label className="meta-label mono">COLOR</label>
              <div className="color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`color-dot color-${c}${selectedWorkout.color === c ? ' selected' : ''}`}
                    onClick={() => changeWorkoutColor(selectedWorkout.id, c)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Exercise list */}
          <div className="exercise-list">
            {selectedWorkout.exercises.length === 0 && (
              <p className="empty-hint">No exercises yet — add some below.</p>
            )}
            {selectedWorkout.exercises.map((ex, idx) => (
              <div key={ex.id} className="ex-row">
                <div className="ex-row-main">
                  <input
                    className="ex-name-input"
                    value={ex.name}
                    onChange={(e) => renameExercise(selectedWorkout.id, ex.id, e.target.value)}
                  />
                  <div className="ex-row-controls">
                    <button
                      className="ex-ctrl-btn"
                      onClick={() => moveExercise(selectedWorkout.id, ex.id, 'up')}
                      disabled={idx === 0}
                    >▲</button>
                    <button
                      className="ex-ctrl-btn"
                      onClick={() => moveExercise(selectedWorkout.id, ex.id, 'down')}
                      disabled={idx === selectedWorkout.exercises.length - 1}
                    >▼</button>
                    <button
                      className="ex-ctrl-btn danger"
                      onClick={() => removeExercise(selectedWorkout.id, ex.id)}
                    >✕</button>
                  </div>
                </div>
                <div className="sets-row">
                  <span className="sets-label mono">SETS</span>
                  <button
                    className="sets-stepper"
                    onClick={() => updateExerciseSets(selectedWorkout.id, ex.id, -1)}
                    disabled={ex.sets <= 1}
                  >−</button>
                  <span className="sets-value mono">{ex.sets}</span>
                  <button
                    className="sets-stepper"
                    onClick={() => updateExerciseSets(selectedWorkout.id, ex.id, 1)}
                    disabled={ex.sets >= 10}
                  >+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Add exercise buttons */}
          <div className="add-exercise-row">
            <button className="add-ex-btn" onClick={() => setShowPresetPicker(true)}>
              + PRESET
            </button>
            <button className="add-ex-btn" onClick={addCustomExercise}>
              + CUSTOM
            </button>
          </div>
        </div>
      )}

      {/* Preset picker modal */}
      {showPresetPicker && (
        <div className="preset-backdrop" onClick={() => setShowPresetPicker(false)}>
          <div className="preset-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="preset-header">
              <span className="mono">PICK PRESET</span>
              <button className="preset-close" onClick={() => setShowPresetPicker(false)}>✕</button>
            </div>
            <div className="preset-list">
              {PRESET_EXERCISES.map((p) => (
                <button
                  key={p.id}
                  className={`preset-item${alreadyAdded.has(p.id) ? ' added' : ''}`}
                  onClick={() => addPresetExercise(p)}
                  disabled={alreadyAdded.has(p.id)}
                >
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-sets mono">{p.sets}×</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
