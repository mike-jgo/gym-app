import React, { useState, useCallback, useEffect } from 'react';
import { calc1RM } from './utils/calc';
import {
  loadRegistryFromStorage,
  saveRegistryToStorage,
  loadRegistry,
  resolveExercise,
  addExercise,
} from './utils/exerciseRegistry';
import {
  loadField,
  clearFields,
  loadBodyweight,
  saveBodyweight,
  loadEffortMode,
  saveEffortMode,
} from './utils/storage';
import { useAuth } from './hooks/useAuth';
import { useTimer } from './hooks/useTimer';
import { useSessionTimer } from './hooks/useSessionTimer';
import { useSupabase } from './hooks/useSupabase';
import { useConfig } from './hooks/useConfig';
import { formatElapsed } from './utils/date';

import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import HomeScreen from './components/HomeScreen';
import HistoryScreen from './components/HistoryScreen';
import TimerBar from './components/TimerBar';
import ExerciseCard from './components/ExerciseCard';
import FooterActions from './components/FooterActions';
import Toast from './components/Toast';
import ManageWorkouts from './components/ManageWorkouts';
import SessionExercisePicker from './components/SessionExercisePicker';

const EFFORT_EPSILON = 0.0001;

function isHalfStep(value) {
  return Math.abs((value * 2) - Math.round(value * 2)) < EFFORT_EPSILON;
}

function roundEffort(value) {
  return Math.round(value * 10) / 10;
}

function parseEffortValue(value) {
  if (value === '' || value == null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEffort(rpeRaw, rirRaw) {
  let rpe = parseEffortValue(rpeRaw);
  let rir = parseEffortValue(rirRaw);

  if (rpe == null && rir == null) {
    return { rpe: null, rir: null, error: null };
  }

  if (rpe != null && (rpe < 6 || rpe > 10 || !isHalfStep(rpe))) {
    return { error: 'RPE must be 6-10 in 0.5 steps' };
  }

  if (rir != null && (rir < 0 || rir > 4 || !isHalfStep(rir))) {
    return { error: 'RIR must be 0-4 in 0.5 steps' };
  }

  if (rpe == null && rir != null) {
    rpe = 10 - rir;
  } else if (rir == null && rpe != null) {
    rir = 10 - rpe;
  } else if (rpe != null && rir != null) {
    rir = 10 - rpe;
  }

  return {
    rpe: roundEffort(rpe),
    rir: roundEffort(rir),
    error: null,
  };
}

export default function App() {
  const { session, loading: authLoading, magicLinkSent, sendMagicLink, signOut } = useAuth();

  const [toast, setToast] = useState({ message: '', isError: false });
  const [bodyweight, setBodyweight] = useState(() => loadBodyweight());
  const [effortMode, setEffortMode] = useState(() => loadEffortMode());
  const [fieldVersion, setFieldVersion] = useState(0);
  const [activeWorkoutId, setActiveWorkoutId] = useState(null);
  const [screen, setScreen] = useState('home');
  const [saving, setSaving] = useState(false);
  const [sessionExercises, setSessionExercises] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [exerciseRegistry, setExerciseRegistry] = useState(() => loadRegistryFromStorage());

  const timer = useTimer();
  const sessionTimer = useSessionTimer();
  const db = useSupabase(session);
  const { config, saveConfig } = useConfig(session);

  // Initialize activeWorkoutId once config loads
  useEffect(() => {
    if (config && !activeWorkoutId) {
      setActiveWorkoutId(config.workouts[0]?.id ?? null);
    }
  }, [config, activeWorkoutId]);

  // Load exercise registry from Supabase once authenticated
  useEffect(() => {
    if (!session) return;
    loadRegistry().then(setExerciseRegistry).catch(() => {});
  }, [session]);

  const activeWorkout = config?.workouts.find((w) => w.id === activeWorkoutId) ?? config?.workouts[0];
  const workoutColor = activeWorkout?.color ?? 'a';
  const workoutLabel = activeWorkout?.label ?? '';
  const exercises = sessionExercises ?? activeWorkout?.exercises ?? [];

  const handleBodyweightChange = (val) => {
    const n = parseFloat(val);
    if (!n || n <= 0) return;
    saveBodyweight(n);
    setBodyweight(n);
  };

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
  };

  const handleEffortModeChange = (mode) => {
    saveEffortMode(mode);
    setEffortMode(mode);
  };

  const handleFieldChange = useCallback(() => {
    setFieldVersion((v) => v + 1);
  }, []);

  // --- Back from session ---
  const handleBack = () => {
    const hasValues = exercises.some((ex) => {
      for (let s = 1; s <= ex.sets; s++) {
        if (loadField(ex.id, s, 'w') || loadField(ex.id, s, 'r')) return true;
      }
      return false;
    });

    if (hasValues && !confirm('Leave session? Your entered sets are preserved but the session won\'t be saved.')) {
      return;
    }

    sessionTimer.reset();
    setScreen('home');
  };

  // --- Start a session ---
  const handleStartSession = (workoutId) => {
    setActiveWorkoutId(workoutId);
    setSessionExercises(null);
    setEditMode(false);
    sessionTimer.start();
    setScreen('session');
  };

  // --- Inline session editing ---
  const handleEditToggle = () => {
    if (!editMode && !sessionExercises) {
      setSessionExercises(JSON.parse(JSON.stringify(exercises)));
    }
    setEditMode((v) => !v);
  };

  const removeExerciseFromSession = (exId) => {
    setSessionExercises((prev) => prev.filter((e) => e.id !== exId));
  };

  const updateSessionExerciseSets = (exId, delta) => {
    setSessionExercises((prev) =>
      prev.map((e) => e.id === exId ? { ...e, sets: Math.max(1, Math.min(10, e.sets + delta)) } : e)
    );
  };

  const handleSessionExercisePick = async (picked) => {
    setShowSessionPicker(false);
    let exercise;
    if (picked.id) {
      exercise = { id: picked.id, name: picked.name, sets: exerciseRegistry[picked.id]?.sets ?? 3 };
    } else {
      const resolved = resolveExercise(picked.name, exerciseRegistry);
      if (resolved.isNew) {
        try {
          const updated = await addExercise({ id: resolved.id, name: resolved.name }, exerciseRegistry);
          setExerciseRegistry(updated);
        } catch {
          // Optimistically update local state even if Supabase insert fails
          const updated = { ...exerciseRegistry, [resolved.id]: { id: resolved.id, name: resolved.name } };
          setExerciseRegistry(updated);
          saveRegistryToStorage(updated);
        }
      }
      exercise = { id: resolved.id, name: resolved.name, sets: 3 };
    }
    setSessionExercises((prev) => [...(prev ?? exercises), exercise]);
  };

  const handleSaveToRoutine = () => {
    const newConfig = {
      ...config,
      workouts: config.workouts.map((w) =>
        w.id === activeWorkoutId ? { ...w, exercises: sessionExercises } : w
      ),
    };
    saveConfig(newConfig);
    setSessionExercises(null);
    setEditMode(false);
    showToast('Routine saved');
  };

  // --- Complete session (save + clear + go home) ---
  const handleComplete = async () => {
    const exercisesData = [];
    let validationError = '';

    for (const ex of exercises) {
      const sets = [];
      for (let s = 1; s <= ex.sets; s++) {
        const w = loadField(ex.id, s, 'w');
        const r = loadField(ex.id, s, 'r');

        if (w || r) {
          const effort = normalizeEffort(loadField(ex.id, s, 'rpe'), loadField(ex.id, s, 'rir'));
          if (effort.error) {
            validationError = `${ex.name} S${s}: ${effort.error}`;
            break;
          }

          const weight = parseFloat(w) || 0;
          const reps = parseInt(r, 10) || 0;
          const volumeLoad = Math.round(weight * reps * 10) / 10;
          const hardSet = effort.rpe != null ? effort.rpe >= 8 : (effort.rir != null && effort.rir <= 2);

          sets.push({
            set: s,
            weight,
            reps,
            rpe: effort.rpe,
            rir: effort.rir,
            volumeLoad,
            hardSet,
          });
        }
      }
      if (validationError) break;

      if (sets.length) {
        const e1rms = sets.map((set) => calc1RM(set.weight, set.reps));
        const best = Math.max(...e1rms);
        const last = e1rms[e1rms.length - 1] || 0;
        const fatigueDrift = best > 0 ? Math.round((((last - best) / best) * 1000)) / 10 : 0;
        const totalVolume = Math.round(sets.reduce((sum, set) => sum + set.volumeLoad, 0) * 10) / 10;
        const hardSets = sets.filter((set) => set.hardSet).length;
        const rpeSets = sets.filter((set) => set.rpe != null);
        const avgRPE = rpeSets.length
          ? Math.round((rpeSets.reduce((sum, set) => sum + set.rpe, 0) / rpeSets.length) * 10) / 10
          : null;
        exercisesData.push({
          id: ex.id,
          name: ex.name,
          sets,
          totalVolume,
          hardSets,
          avgRPE,
          fatigueDrift,
          best1RM: Math.round(best * 10) / 10,
        });
      }
    }

    if (validationError) {
      showToast(validationError, true);
      return;
    }

    if (!exercisesData.length) {
      showToast('Nothing to save — enter some sets first', true);
      return;
    }

    setSaving(true);
    const duration = sessionTimer.stop();
    try {
      await db.save({
        workout: workoutLabel,
        workoutId: activeWorkoutId,
        workoutColor,
        bodyweight,
        exercises: exercisesData,
        duration,
      });
      exercises.forEach((ex) => clearFields(ex.id, ex.sets));
      setFieldVersion((v) => v + 1);
      setScreen('home');
      showToast('Workout complete!');
    } catch (err) {
      sessionTimer.start(); // resume timer if save failed
      showToast('Save failed: ' + err.message, true);
    } finally {
      setSaving(false);
    }
  };

  // --- Export to clipboard ---
  const handleExport = () => {
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    let text = `Fitlog Workout ${workoutLabel} — ${date}\nBW: ${bodyweight} kg\n${'─'.repeat(30)}\n`;

    exercises.forEach((ex) => {
      text += `\n${ex.name}\n`;
      for (let s = 1; s <= ex.sets; s++) {
        const w = loadField(ex.id, s, 'w');
        const r = loadField(ex.id, s, 'r');
        const rpe = loadField(ex.id, s, 'rpe');
        const rir = loadField(ex.id, s, 'rir');
        const effortText = rpe ? ` @${rpe}` : (rir ? ` (RIR ${rir})` : '');
        if (w || r) text += `  S${s}: ${w || '-'} kg x ${r || '-'} reps${effortText}\n`;
      }
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!');
    }).catch(() => {
      showToast('Copy failed', true);
    });
  };

  // --- Clear session ---
  const handleClear = () => {
    if (!confirm(`Clear all weights/reps for Workout ${workoutLabel}?`)) return;
    exercises.forEach((ex) => clearFields(ex.id, ex.sets));
    setFieldVersion((v) => v + 1);
    showToast('Session cleared');
  };

  // --- Manage screen ---
  const handleManageSave = (newConfig) => {
    saveConfig(newConfig);
    const stillExists = newConfig.workouts.find((w) => w.id === activeWorkoutId);
    if (!stillExists) {
      setActiveWorkoutId(newConfig.workouts[0]?.id ?? null);
    }
    setScreen('home');
    showToast('Workouts saved');
  };

  // ── Auth gate ─────────────────────────────────────────────────

  if (authLoading) return null;

  if (!session) {
    return (
      <AuthScreen
        onSendMagicLink={sendMagicLink}
        magicLinkSent={magicLinkSent}
      />
    );
  }

  // ── App screens ───────────────────────────────────────────────

  if (screen === 'manage' && config) {
    return (
      <ManageWorkouts
        config={config}
        onSave={handleManageSave}
        onCancel={() => setScreen('home')}
        registry={exerciseRegistry}
        onRegistryUpdate={(updated) => { setExerciseRegistry(updated); saveRegistryToStorage(updated); }}
      />
    );
  }

  if (!config) return null;

  if (screen === 'history') {
    return (
      <>
        <HistoryScreen
          onBack={() => setScreen('home')}
          sessions={db.sessions}
          loading={db.status === 'syncing'}
        />
        <Toast
          message={toast.message}
          isError={toast.isError}
          onDone={() => setToast({ message: '', isError: false })}
        />
      </>
    );
  }

  if (screen === 'home') {
    return (
      <>
        <HomeScreen
          workouts={config.workouts}
          onStart={handleStartSession}
          onManage={() => setScreen('manage')}
          onHistory={() => setScreen('history')}
          onSignOut={signOut}
          syncStatus={db.status}
        />
        <Toast
          message={toast.message}
          isError={toast.isError}
          onDone={() => setToast({ message: '', isError: false })}
        />
      </>
    );
  }

  return (
    <>
      <Header
        workoutColor={workoutColor}
        workoutLabel={workoutLabel}
        syncStatus={db.status}
        bodyweight={bodyweight}
        onBodyweightChange={handleBodyweightChange}
        onBack={handleBack}
        sessionElapsed={formatElapsed(sessionTimer.elapsed)}
        onEditToggle={handleEditToggle}
        editMode={editMode}
      />

      <TimerBar
        display={timer.display}
        percent={timer.percent}
        running={timer.running}
        finished={timer.finished}
        onToggle={timer.toggle}
        workoutColor={workoutColor}
      />

      {/* Effort mode toggle */}
      <div
        className="inline-flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-full border border-line bg-surface font-mono text-[0.7rem] text-muted"
        style={{ '--accent': `var(--accent-${workoutColor})`, '--accent-dim': `var(--accent-${workoutColor}-dim)` }}
      >
        <span>INPUT</span>
        {['rpe', 'rir'].map((mode) => (
          <button
            key={mode}
            className={`border rounded-full px-2.5 py-1 font-mono text-[0.72rem] cursor-pointer transition-colors ${
              effortMode === mode
                ? 'font-bold border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-dim)]'
                : 'border-line bg-surface2 text-muted'
            }`}
            onClick={() => handleEffortModeChange(mode)}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {exercises.map((ex) => (
        <React.Fragment key={ex.id}>
          {editMode && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface border border-line rounded-t-card -mb-[2px]">
              <span className="text-[0.78rem] font-semibold text-muted flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                {ex.name}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  className="w-7 h-7 rounded-md border-[1.5px] border-line bg-surface2 text-text text-base cursor-pointer flex items-center justify-center transition-colors hover:enabled:border-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => updateSessionExerciseSets(ex.id, -1)}
                  disabled={ex.sets <= 1}
                >−</button>
                <span className="font-mono text-[0.75rem] text-muted min-w-[42px] text-center">{ex.sets} sets</span>
                <button
                  className="w-7 h-7 rounded-md border-[1.5px] border-line bg-surface2 text-text text-base cursor-pointer flex items-center justify-center transition-colors hover:enabled:border-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => updateSessionExerciseSets(ex.id, 1)}
                  disabled={ex.sets >= 10}
                >+</button>
                <button
                  className="px-2 py-1 rounded-md border-[1.5px] border-line bg-transparent text-red text-[0.8rem] cursor-pointer transition-all hover:bg-[rgba(255,74,106,0.1)] hover:border-red"
                  onClick={() => removeExerciseFromSession(ex.id)}
                >✕</button>
              </div>
            </div>
          )}
          <ExerciseCard
            exercise={ex}
            lastLift={db.lastLifts[ex.id] || null}
            personalBest={db.personalBests[ex.id] || null}
            workoutColor={workoutColor}
            fieldVersion={fieldVersion}
            effortMode={effortMode}
            onFieldChange={handleFieldChange}
          />
        </React.Fragment>
      ))}

      {editMode && (
        <div
          className="flex gap-2.5 mt-2"
          style={{ '--accent': `var(--accent-${workoutColor})`, '--accent-dim': `var(--accent-${workoutColor}-dim)` }}
        >
          <button
            className="flex-1 py-[13px] rounded-card border-2 border-dashed border-line bg-transparent text-muted font-sans font-bold text-[0.9rem] cursor-pointer transition-all hover:border-muted hover:text-text"
            onClick={() => setShowSessionPicker(true)}
          >
            + ADD EXERCISE
          </button>
          <button
            className="flex-1 py-[13px] rounded-card border-2 border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)] font-sans font-bold text-[0.9rem] cursor-pointer transition-all"
            onClick={handleSaveToRoutine}
          >
            SAVE TO ROUTINE
          </button>
        </div>
      )}

      <FooterActions
        workoutColor={workoutColor}
        onComplete={handleComplete}
        onExport={handleExport}
        onClear={handleClear}
        saving={saving}
      />

      <Toast
        message={toast.message}
        isError={toast.isError}
        onDone={() => setToast({ message: '', isError: false })}
      />

      {showSessionPicker && (
        <SessionExercisePicker
          registry={exerciseRegistry}
          sessionExerciseIds={new Set(exercises.map((e) => e.id))}
          onPick={handleSessionExercisePick}
          onClose={() => setShowSessionPicker(false)}
        />
      )}
    </>
  );
}
