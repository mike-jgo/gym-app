import React, { useState } from 'react';
import { nextAvailableColor } from '../utils/config';
import { resolveExercise, addExercise } from '../utils/exerciseRegistry';
import SessionExercisePicker from './SessionExercisePicker';

const COLORS = ['a', 'b', 'c', 'd', 'e', 'f'];
const MAX_WORKOUTS = 6;
const ACCENT = {
  a: 'var(--accent-a)', b: 'var(--accent-b)', c: 'var(--accent-c)',
  d: 'var(--accent-d)', e: 'var(--accent-e)', f: 'var(--accent-f)',
};
const ACCENT_DIM = {
  a: 'var(--accent-a-dim)', b: 'var(--accent-b-dim)', c: 'var(--accent-c-dim)',
  d: 'var(--accent-d-dim)', e: 'var(--accent-e-dim)', f: 'var(--accent-f-dim)',
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export default function ManageWorkouts({ config, onSave, onCancel, registry = {}, onRegistryUpdate, userId }) {
  const [draft, setDraft] = useState(() => deepClone(config));
  const [selectedId, setSelectedId] = useState(draft.workouts[0]?.id ?? null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedWorkout = draft.workouts.find((w) => w.id === selectedId);

  // ── Workout mutations ──────────────────────────────────────

  const addWorkout = () => {
    if (draft.workouts.length >= MAX_WORKOUTS) return;
    const usedColors = draft.workouts.map((w) => w.color);
    const color = nextAvailableColor(usedColors);
    const id = `workout_${Date.now().toString(36)}`;
    const newWorkout = { id, label: 'New', color, exercises: [] };
    setDraft({ ...draft, workouts: [...draft.workouts, newWorkout] });
    setSelectedId(id);
  };

  const deleteWorkout = (id) => {
    if (draft.workouts.length <= 1) return;
    if (!confirm('Delete this workout?')) return;
    const updated = { ...draft, workouts: draft.workouts.filter((w) => w.id !== id) };
    setDraft(updated);
    if (selectedId === id) setSelectedId(updated.workouts[0]?.id ?? null);
  };

  const renameWorkout = (id, label) =>
    setDraft({ ...draft, workouts: draft.workouts.map((w) => w.id === id ? { ...w, label } : w) });

  const changeWorkoutColor = (id, color) =>
    setDraft({ ...draft, workouts: draft.workouts.map((w) => w.id === id ? { ...w, color } : w) });

  // ── Exercise mutations ─────────────────────────────────────

  const updateExercises = (workoutId, updater) =>
    setDraft({ ...draft, workouts: draft.workouts.map((w) => w.id === workoutId ? { ...w, exercises: updater(w.exercises) } : w) });

  const handleExercisePick = async (picked) => {
    setShowPicker(false);
    if (!selectedId) return;
    let exercise;
    if (picked.id) {
      exercise = { id: picked.id, name: picked.name, sets: 3 };
    } else {
      const resolved = resolveExercise(picked.name, registry);
      if (resolved.isNew && onRegistryUpdate) {
        try {
          const updated = await addExercise({ id: resolved.id, name: resolved.name }, registry, userId);
          onRegistryUpdate(updated);
        } catch {
          onRegistryUpdate({ ...registry, [resolved.id]: { id: resolved.id, name: resolved.name } });
        }
      }
      exercise = { id: resolved.id, name: resolved.name, sets: 3 };
    }
    updateExercises(selectedId, (exs) => {
      if (exs.find((e) => e.id === exercise.id)) return exs;
      return [...exs, exercise];
    });
  };

  const removeExercise = (workoutId, exId) =>
    updateExercises(workoutId, (exs) => exs.filter((e) => e.id !== exId));

  const updateExerciseSets = (workoutId, exId, delta) =>
    updateExercises(workoutId, (exs) =>
      exs.map((e) => e.id === exId ? { ...e, sets: Math.max(1, Math.min(10, e.sets + delta)) } : e)
    );

  const renameExercise = (workoutId, exId, name) =>
    updateExercises(workoutId, (exs) => exs.map((e) => e.id === exId ? { ...e, name } : e));

  const moveExercise = (workoutId, exId, dir) =>
    updateExercises(workoutId, (exs) => {
      const idx = exs.findIndex((e) => e.id === exId);
      if (idx < 0) return exs;
      const next = dir === 'up' ? idx - 1 : idx + 1;
      if (next < 0 || next >= exs.length) return exs;
      const arr = [...exs];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });

  const handleSave = () => { setSaving(true); onSave(draft); };

  const alreadyAdded = new Set(selectedWorkout?.exercises.map((e) => e.id) ?? []);

  // ── Shared input style ─────────────────────────────────────
  const fieldInput = 'flex-1 px-3 py-2 rounded-lg border-[1.5px] border-line bg-surface2 text-text font-sans text-base font-semibold outline-none focus:border-muted';
  const ctrlBtn = 'px-[9px] py-1.5 rounded-lg border-[1.5px] border-line bg-surface2 text-muted cursor-pointer text-[0.8rem] transition-all hover:enabled:text-text hover:enabled:border-muted disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 bg-bg z-[100] flex flex-col overflow-hidden"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 pb-4 border-b border-line shrink-0">
        <span className="font-mono text-base font-bold text-muted tracking-wide">MANAGE WORKOUTS</span>
        <div className="flex gap-2">
          <button
            className="px-[18px] py-2 rounded-[10px] font-sans font-bold text-[0.9rem] border-2 cursor-pointer transition-all active:scale-[0.96] border-green text-green bg-[var(--green-dim)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '…' : 'SAVE'}
          </button>
          <button
            className="px-[18px] py-2 rounded-[10px] font-sans font-bold text-[0.9rem] border-2 border-line bg-surface text-muted cursor-pointer transition-all active:scale-[0.96]"
            onClick={onCancel}
          >
            CANCEL
          </button>
        </div>
      </div>

      {/* Workout tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden shrink-0 border-b border-line">
        {draft.workouts.map((w) => (
          <button
            key={w.id}
            className="shrink-0 px-4 py-2 rounded-full font-sans font-bold text-[0.85rem] border-2 cursor-pointer transition-all"
            style={selectedId === w.id
              ? { borderColor: ACCENT[w.color], background: ACCENT_DIM[w.color], color: ACCENT[w.color] }
              : { borderColor: 'var(--color-line)', background: 'var(--color-surface)', color: 'var(--color-muted)' }
            }
            onClick={() => setSelectedId(w.id)}
          >
            {w.label}
          </button>
        ))}
        <button
          className="shrink-0 px-4 py-2 rounded-full font-sans font-bold text-[0.85rem] border-2 border-line bg-surface text-muted cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={addWorkout}
          disabled={draft.workouts.length >= MAX_WORKOUTS}
        >
          + ADD
        </button>
      </div>

      {selectedWorkout && (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Name + color */}
          <div className="bg-surface border border-line rounded-card p-3.5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <label className="font-mono text-[0.75rem] text-muted font-semibold tracking-wide w-[52px] shrink-0">NAME</label>
              <input
                className={fieldInput}
                value={selectedWorkout.label}
                onChange={(e) => renameWorkout(selectedWorkout.id, e.target.value)}
                maxLength={20}
              />
              {draft.workouts.length > 1 && (
                <button
                  className="px-2.5 py-1.5 rounded-lg border-[1.5px] border-line bg-transparent text-red cursor-pointer text-[0.85rem] transition-all hover:bg-[rgba(255,74,106,0.1)] hover:border-red"
                  onClick={() => deleteWorkout(selectedWorkout.id)}
                  title="Delete workout"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <label className="font-mono text-[0.75rem] text-muted font-semibold tracking-wide w-[52px] shrink-0">COLOR</label>
              <div className="flex gap-2.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-[26px] h-[26px] rounded-full border-[3px] cursor-pointer transition-all shrink-0"
                    style={{
                      background: ACCENT[c],
                      borderColor: selectedWorkout.color === c ? 'var(--color-text)' : 'transparent',
                      transform: selectedWorkout.color === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onClick={() => changeWorkoutColor(selectedWorkout.id, c)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Exercise list */}
          <div className="flex flex-col gap-2.5">
            {selectedWorkout.exercises.length === 0 && (
              <p className="text-muted text-[0.9rem] py-2.5">No exercises yet — add some below.</p>
            )}
            {selectedWorkout.exercises.map((ex, idx) => (
              <div key={ex.id} className="bg-surface border border-line rounded-card p-3 flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <input
                    className={`${fieldInput} text-[0.95rem]`}
                    value={ex.name}
                    onChange={(e) => renameExercise(selectedWorkout.id, ex.id, e.target.value)}
                  />
                  <div className="flex gap-1">
                    <button className={ctrlBtn} onClick={() => moveExercise(selectedWorkout.id, ex.id, 'up')} disabled={idx === 0}>▲</button>
                    <button className={ctrlBtn} onClick={() => moveExercise(selectedWorkout.id, ex.id, 'down')} disabled={idx === selectedWorkout.exercises.length - 1}>▼</button>
                    <button
                      className="px-[9px] py-1.5 rounded-lg border-[1.5px] border-line bg-surface2 text-red cursor-pointer text-[0.8rem] transition-all hover:border-red hover:bg-[rgba(255,74,106,0.1)]"
                      onClick={() => removeExercise(selectedWorkout.id, ex.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[0.72rem] text-muted font-semibold tracking-wide w-9">SETS</span>
                  <button className={`w-[34px] h-[34px] rounded-lg border-[1.5px] border-line bg-surface2 text-text text-[1.1rem] cursor-pointer flex items-center justify-center transition-all hover:enabled:border-muted disabled:opacity-30 disabled:cursor-not-allowed`}
                    onClick={() => updateExerciseSets(selectedWorkout.id, ex.id, -1)} disabled={ex.sets <= 1}>−</button>
                  <span className="font-mono text-base font-bold min-w-[20px] text-center">{ex.sets}</span>
                  <button className={`w-[34px] h-[34px] rounded-lg border-[1.5px] border-line bg-surface2 text-text text-[1.1rem] cursor-pointer flex items-center justify-center transition-all hover:enabled:border-muted disabled:opacity-30 disabled:cursor-not-allowed`}
                    onClick={() => updateExerciseSets(selectedWorkout.id, ex.id, 1)} disabled={ex.sets >= 10}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Add exercise */}
          <button
            className="w-full py-[13px] rounded-card border-2 border-dashed border-line bg-transparent text-muted font-sans font-bold text-[0.9rem] cursor-pointer transition-all tracking-wide hover:border-muted hover:text-text"
            onClick={() => setShowPicker(true)}
          >
            + ADD EXERCISE
          </button>
        </div>
      )}

      {showPicker && (
        <SessionExercisePicker
          registry={registry}
          sessionExerciseIds={alreadyAdded}
          onPick={handleExercisePick}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
