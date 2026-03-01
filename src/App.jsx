import React, { useState, useCallback, useEffect } from 'react';
import { calc1RM } from './utils/calc';
import { loadField, clearFields, loadBodyweight, saveBodyweight } from './utils/storage';
import { useTimer } from './hooks/useTimer';
import { useSessionTimer } from './hooks/useSessionTimer';
import { useSheets } from './hooks/useSheets';
import { useConfig } from './hooks/useConfig';
import { formatElapsed } from './utils/date';

import { fetchSessions } from './utils/sheets';

import Header from './components/Header';
import HomeScreen from './components/HomeScreen';
import HistoryScreen from './components/HistoryScreen';
import TimerBar from './components/TimerBar';
import ExerciseCard from './components/ExerciseCard';
import FooterActions from './components/FooterActions';
import Toast from './components/Toast';
import ManageWorkouts from './components/ManageWorkouts';

export default function App() {
  const [toast, setToast] = useState({ message: '', isError: false });
  const [bodyweight, setBodyweight] = useState(() => loadBodyweight());
  const [fieldVersion, setFieldVersion] = useState(0);
  const [activeWorkoutId, setActiveWorkoutId] = useState(null);
  const [screen, setScreen] = useState('home');
  const [saving, setSaving] = useState(false);
  const timer = useTimer();
  const sessionTimer = useSessionTimer();
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

  const handleBodyweightChange = (val) => {
    const n = parseFloat(val);
    if (!n || n <= 0) return;
    saveBodyweight(n);
    setBodyweight(n);
  };

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
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
    sessionTimer.start();
    setScreen('session');
  };

  // --- Complete session (save + clear + go home) ---
  const handleComplete = async () => {
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

    setSaving(true);
    const duration = sessionTimer.stop();
    try {
      await sheets.save({ workout: workoutLabel, workoutColor, bodyweight, exercises: exercisesData, duration });
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
    const stillExists = newConfig.workouts.find((w) => w.id === activeWorkoutId);
    if (!stillExists) {
      setActiveWorkoutId(newConfig.workouts[0]?.id ?? null);
    }
    setScreen('home');
    showToast('Workouts saved');
  };

  if (screen === 'manage' && config) {
    return (
      <ManageWorkouts
        config={config}
        onSave={handleManageSave}
        onCancel={() => setScreen('home')}
      />
    );
  }

  if (!config) return null;

  if (screen === 'history') {
    return (
      <>
        <HistoryScreen
          onBack={() => setScreen('home')}
          onFetch={fetchSessions}
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
          sheetsConfigured={sheets.configured}
          onConnect={async (url) => {
            const ok = await sheets.connect(url);
            if (ok) showToast('Connected to Google Sheets!');
            else showToast('Connection failed — check URL', true);
            return ok;
          }}
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
        syncStatus={sheets.status}
        bodyweight={bodyweight}
        onBodyweightChange={handleBodyweightChange}
        onBack={handleBack}
        sessionElapsed={formatElapsed(sessionTimer.elapsed)}
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
    </>
  );
}
