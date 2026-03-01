import React, { useState } from 'react';
import './Header.css';

export default function Header({ workoutColor, workoutLabel, syncStatus, bodyweight, onBodyweightChange, onBack, sessionElapsed }) {
  const [editing, setEditing] = useState(false);

  const commit = (e) => {
    onBodyweightChange(e.target.value);
    setEditing(false);
  };

  return (
    <div className="header">
      <div className="header-left">
        {onBack && (
          <button className="back-btn" onClick={onBack} aria-label="Back to home">←</button>
        )}
        <h1 className="header-title mono">
          FITLOG <span className={`accent-${workoutColor}`}>{workoutLabel}</span>
        </h1>
      </div>
      <div className="header-right">
        {sessionElapsed && <span className="session-elapsed mono">{sessionElapsed}</span>}
        {editing ? (
          <input
            className="bw-input mono"
            defaultValue={bodyweight}
            inputMode="decimal"
            autoFocus
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit(e)}
          />
        ) : (
          <button className="bw-badge mono" onClick={() => setEditing(true)}>
            BW {bodyweight} kg
          </button>
        )}
        <div
          className={`sync-dot ${syncStatus}`}
          title={`Sheets: ${syncStatus}`}
        />
      </div>
    </div>
  );
}
