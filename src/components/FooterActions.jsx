import React from 'react';
import './FooterActions.css';

export default function FooterActions({ workout, onSave, onExport, onClear }) {
  return (
    <div className="footer-actions">
      <button className="action-btn save" onClick={onSave}>SAVE</button>
      <button className={`action-btn export workout-${workout.toLowerCase()}`} onClick={onExport}>EXPORT</button>
      <button className="action-btn clear" onClick={onClear}>CLEAR</button>
    </div>
  );
}
