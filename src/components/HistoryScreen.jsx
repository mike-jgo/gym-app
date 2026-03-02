import React, { useState, useEffect } from 'react';
import { formatDateTime, formatDuration } from '../utils/date';
import './HistoryScreen.css';

export default function HistoryScreen({ onBack, onFetch }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    onFetch()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="history-screen">
      <div className="history-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to home">←</button>
        <h1 className="history-title mono">HISTORY</h1>
      </div>

      {loading && <p className="history-status history-loading mono">Loading…</p>}
      {error && <p className="history-status history-error">{error}</p>}
      {!loading && !error && sessions.length === 0 && (
        <p className="history-status">No sessions recorded yet.</p>
      )}

      <div className="session-list">
        {sessions.map((session) => (
          <div key={session.id} className={`session-card border-${session.workoutColor}`}>
            <div className="session-card-header">
              <span className="session-date mono">{formatDateTime(session.date)}</span>
              <span className={`session-workout-label mono accent-${session.workoutColor}`}>
                {session.workout}
              </span>
            </div>
            <div className="session-meta mono">
              <span>BW {session.bodyweight} kg</span>
              {session.duration > 0 && <span>{formatDuration(session.duration)}</span>}
            </div>
            <div className="session-exercises">
              {session.exercises.map((ex) => (
                <div key={ex.id} className="session-exercise">
                  <span className="session-exercise-name">{ex.name}</span>
                  <div className="session-sets">
                    {ex.sets.map((s) => (
                      <span key={s.set} className="session-set mono">
                        {s.weight}x{s.reps}
                        {Number.isFinite(parseFloat(s.rpe)) && ` @${parseFloat(s.rpe)}`}
                        {Number.isFinite(parseFloat(s.rir)) && ` (RIR ${parseFloat(s.rir)})`}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
