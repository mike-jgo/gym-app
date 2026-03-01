import React, { useState, useCallback, useEffect } from 'react';
import { calc1RM } from './utils/calc';
import { loadField, clearFields } from './utils/storage';
import { useTimer } from './hooks/useTimer';
import { useSheets } from './hooks/useSheets';
import { useConfig } from './hooks/useConfig';

import Header from './components/Header';
import SetupBanner from './components/SetupBanner';
import WorkoutSelector from './components/WorkoutSelector';
import TimerBar from './components/TimerBar';
import ExerciseCard from './components/ExerciseCard';
import FooterActions from './components/FooterActions';
import Toast from './components/Toast';
import ManageWorkouts from './components/ManageWorkouts';

export default function App() {
  const [toast, setToast] = useState({ message: '', isError: false });
  const [fieldVersion, setFieldVersion] = useState(0);
  const [activeWorkoutId, setActiveWorkoutId] = useState(null);
  const [screen, setScreen] = useState('tracker');
  const timer = useTimer();
  const sheets = useSheets();
  const { config, saveConfig } = useConfig();

  // Initialize activeWorkoutId once config loads
  useEffect(() => {
    if (config && !activeWorkoutId) {
      setActiveWorkoutId(config.workouts[0]?.id ?? null);
    }
  }, [config, activeWorkoutId]);

  const activeWorkout = config?.workouts.find((w) => w.id === activeWorkoutId) ?? config?.workouts[0];
  const workoutColor = activeWorkout?.color ?? 'a';
  const workoutLabel = activeWorkout?.label ?? '';
  const exercises = activeWorkout?.exercises ?? [];

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
  };

  const handleFieldChange = useCallback(() => {
    setFieldVersion((v) => v + 1);
  }, []);

  // --- Save to Google Sheets ---
  const handleSave = async () => {
    const exercisesData = [];

    exercises.forEach((ex) => {
      const sets = [];
      for (let s = 1; s <= ex.sets; s++) {
        const w = loadField(ex.id, s, 'w');
        const r = loadField(ex.id, s, 'r');
        if (w || r) {
          sets.push({ set: s, weight: parseFloat(w) || 0, reps: parseInt(r) || 0 });
        }
      }
      if (sets.length) {
        const best = Math.max(...sets.map((s) => calc1RM(s.weight, s.reps)));
        exercisesData.push({
          id: ex.id,
          name: ex.name,
          sets,
          best1RM: Math.round(best * 10) / 10,
        });
      }
    });

    if (!exercisesData.length) {
      showToast('Nothing to save — enter some sets first', true);
      return;
    }

    if (!sheets.configured) {
      showToast('Connect Google Sheets first!', true);
      return;
    }

    try {
      await sheets.save({ workout: workoutLabel, exercises: exercisesData });
      showToast('Saved to Google Sheets!');
    } catch (err) {
      showToast('Save failed: ' + err.message, true);
    }
  };

  // --- Export to clipboard ---
  const handleExport = () => {
    const date = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    let text = `FBEOD Workout ${workoutLabel} — ${date}\nBW: 64.5 kg\n${'─'.repeat(30)}\n`;

    exercises.forEach((ex) => {
      text += `\n${ex.name}\n`;
      for (let s = 1; s <= ex.sets; s++) {
        const w = loadField(ex.id, s, 'w');
        const r = loadField(ex.id, s, 'r');
        if (w || r) text += `  S${s}: ${w || '—'} kg × ${r || '—'} reps\n`;
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
    // If active workout was deleted, fall back to first
    const stillExists = newConfig.workouts.find((w) => w.id === activeWorkoutId);
    if (!stillExists) {
      setActiveWorkoutId(newConfig.workouts[0]?.id ?? null);
    }
    setScreen('tracker');
    showToast('Workouts saved');
  };

  if (screen === 'manage' && config) {
    return (
      <ManageWorkouts
        config={config}
        onSave={handleManageSave}
        onCancel={() => setScreen('tracker')}
      />
    );
  }

  if (!config) return null;

  return (
    <>
      <Header workoutColor={workoutColor} workoutLabel={workoutLabel} syncStatus={sheets.status} />

      {!sheets.configured && (
        <SetupBanner
          onConnect={async (url) => {
            const ok = await sheets.connect(url);
            if (ok) showToast('Connected to Google Sheets!');
            else showToast('Connection failed — check URL', true);
            return ok;
          }}
        />
      )}

      <WorkoutSelector
        workouts={config.workouts}
        currentId={activeWorkout?.id}
        onSelect={setActiveWorkoutId}
        onManage={() => setScreen('manage')}
      />

      <TimerBar
        display={timer.display}
        percent={timer.percent}
        running={timer.running}
        finished={timer.finished}
        onToggle={timer.toggle}
        workoutColor={workoutColor}
      />

      {exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          lastLift={sheets.lastLifts[ex.id] || null}
          workoutColor={workoutColor}
          fieldVersion={fieldVersion}
          onFieldChange={handleFieldChange}
        />
      ))}

      <FooterActions
        workoutColor={workoutColor}
        onSave={handleSave}
        onExport={handleExport}
        onClear={handleClear}
      />

      <Toast
        message={toast.message}
        isError={toast.isError}
        onDone={() => setToast({ message: '', isError: false })}
      />
    </>
  );
}
