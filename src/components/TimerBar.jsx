import React from 'react';
import './TimerBar.css';

export default function TimerBar({ display, percent, running, finished, onToggle, workout }) {
  return (
    <div className="timer-bar" style={{ '--timer-pct': `${percent}%` }}>
      <span className={`timer-display mono ${finished ? 'alert' : ''}`}>
        {display}
      </span>
      <button
        className={`timer-btn ${running ? 'stop' : 'start'} ${workout === 'A' ? 'accent-a' : 'accent-b'}`}
        onClick={onToggle}
      >
        {running ? 'STOP' : 'REST'}
      </button>
    </div>
  );
}
