import React from 'react';
import './WorkoutToggle.css';

export default function WorkoutToggle({ current, onSwitch }) {
  return (
    <div className="toggle-row">
      <button
        className={`toggle-btn ${current === 'A' ? 'active accent-a' : ''}`}
        onClick={() => onSwitch('A')}
      >
        WORKOUT A
      </button>
      <button
        className={`toggle-btn ${current === 'B' ? 'active accent-b' : ''}`}
        onClick={() => onSwitch('B')}
      >
        WORKOUT B
      </button>
    </div>
  );
}
