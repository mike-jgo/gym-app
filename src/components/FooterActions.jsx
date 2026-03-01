import React from 'react';
import './FooterActions.css';

export default function FooterActions({ workoutColor, onComplete, onExport, onClear, saving }) {
  return (
    <div className="footer-actions">
      <button
        className={`action-btn complete workout-${workoutColor}${saving ? ' loading' : ''}`}
        onClick={onComplete}
        disabled={saving}
      >
        {saving ? 'SAVING…' : 'COMPLETE'}
      </button>
      <button className={`action-btn export workout-${workoutColor}`} onClick={onExport}>EXPORT</button>
      <button className="action-btn clear" onClick={onClear}>CLEAR</button>
    </div>
  );
}
