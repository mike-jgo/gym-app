import React, { useEffect, useMemo, useState } from 'react';
import {
  normalizeSessions,
  listExercisesFromSessions,
  buildExerciseE1RMSeries,
  buildWeeklyVolumeSeries,
} from '../utils/stats';
import LineChart from './charts/LineChart';
import BarLineChart from './charts/BarLineChart';
import './StatsScreen.css';

const RANGES = ['4W', '12W', 'ALL'];

export default function StatsScreen({ onBack, onFetch }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState('12W');
  const [exerciseId, setExerciseId] = useState('');

  const load = () => {
    setLoading(true);
    setError('');

    onFetch()
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err?.message === 'No API URL configured') {
          setError('Connect Google Sheets first to view stats.');
          return;
        }
        setError(err?.message || 'Failed to load stats');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const normalizedSessions = useMemo(() => normalizeSessions(sessions), [sessions]);
  const exerciseOptions = useMemo(
    () => listExercisesFromSessions(normalizedSessions),
    [normalizedSessions]
  );

  useEffect(() => {
    if (!exerciseOptions.length) {
      setExerciseId('');
      return;
    }
    if (!exerciseId || !exerciseOptions.some((option) => option.id === exerciseId)) {
      setExerciseId(exerciseOptions[0].id);
    }
  }, [exerciseOptions, exerciseId]);

  const e1rmSeries = useMemo(
    () => buildExerciseE1RMSeries(normalizedSessions, exerciseId, range),
    [normalizedSessions, exerciseId, range]
  );

  const weeklySeries = useMemo(
    () => buildWeeklyVolumeSeries(normalizedSessions, range),
    [normalizedSessions, range]
  );

  const totalVolume = useMemo(
    () => Math.round(weeklySeries.reduce((sum, point) => sum + point.volume, 0)),
    [weeklySeries]
  );

  const totalHardSets = useMemo(
    () => weeklySeries.reduce((sum, point) => sum + point.hardSets, 0),
    [weeklySeries]
  );

  const showNoData = !loading && !error && normalizedSessions.length === 0;

  return (
    <div className="stats-screen">
      <div className="stats-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">←</button>
        <h1 className="stats-title mono">STATS</h1>
      </div>

      <div className="stats-filters">
        <div className="range-pills mono">
          {RANGES.map((value) => (
            <button
              key={value}
              className={`range-pill ${range === value ? 'active' : ''}`}
              onClick={() => setRange(value)}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="exercise-filter">
          <label className="mono" htmlFor="exercise-select">Exercise</label>
          <select
            id="exercise-select"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            disabled={!exerciseOptions.length}
          >
            {!exerciseOptions.length && <option value="">No exercise data</option>}
            {exerciseOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="stats-status stats-loading mono">Loading…</p>}
      {error && (
        <div className="stats-error-wrap">
          <p className="stats-status stats-error">{error}</p>
          <button className="stats-retry mono" onClick={load}>RETRY</button>
        </div>
      )}
      {showNoData && <p className="stats-status">No sessions recorded yet.</p>}

      {!loading && !error && !showNoData && (
        <>
          <div className="stats-summary mono">
            <div className="summary-card">
              <span className="summary-label">TOTAL VOLUME</span>
              <strong>{totalVolume.toLocaleString()} kg</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">HARD SETS</span>
              <strong>{totalHardSets}</strong>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h2 className="mono">BEST e1RM TREND</h2>
            </div>
            <LineChart points={e1rmSeries} strokeClass="chart-line-strength" />
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h2 className="mono">WEEKLY VOLUME + HARD SETS</h2>
            </div>
            <BarLineChart points={weeklySeries} />
          </div>
        </>
      )}
    </div>
  );
}
