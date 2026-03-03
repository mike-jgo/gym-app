import React, { useState, useCallback, useEffect } from 'react';
import { calc1RM } from './utils/calc';
import {
  loadField,
  clearFields,
  loadBodyweight,
  saveBodyweight,
  loadEffortMode,
  saveEffortMode,
} from './utils/storage';
import { useTimer } from './hooks/useTimer';
import { useSessionTimer } from './hooks/useSessionTimer';
import { useSheets } from './hooks/useSheets';
import { useConfig } from './hooks/useConfig';
import { formatElapsed } from './utils/date';

import { fetchSessions } from './utils/sheets';

import Header from './components/Header';
import HomeScreen from './components/HomeScreen';
import HistoryScreen from './components/HistoryScreen';
import StatsScreen from './components/StatsScreen';
import TimerBar from './components/TimerBar';
import ExerciseCard from './components/ExerciseCard';
import FooterActions from './components/FooterActions';
import Toast from './components/Toast';
import ManageWorkouts from './components/ManageWorkouts';

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
  const [toast, setToast] = useState({ message: '', isError: false });
  const [bodyweight, setBodyweight] = useState(() => loadBodyweight());
  const [effortMode, setEffortMode] = useState(() => loadEffortMode());
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
    sessionTimer.start();
    setScreen('session');
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

  if (screen === 'stats') {
    return (
      <>
        <StatsScreen
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
          onStats={() => setScreen('stats')}
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

      <div className="effort-toggle mono">
        <span>INPUT</span>
        <button
          className={`effort-mode-btn ${effortMode === 'rpe' ? `active accent-${workoutColor}` : ''}`}
          onClick={() => handleEffortModeChange('rpe')}
        >
          RPE
        </button>
        <button
          className={`effort-mode-btn ${effortMode === 'rir' ? `active accent-${workoutColor}` : ''}`}
          onClick={() => handleEffortModeChange('rir')}
        >
          RIR
        </button>
      </div>

      {exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          lastLift={sheets.lastLifts[ex.id] || null}
          personalBest={sheets.personalBests[ex.id] || null}
          workoutColor={workoutColor}
          fieldVersion={fieldVersion}
          effortMode={effortMode}
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
