import React from 'react';
import SetupBanner from './SetupBanner';
import './HomeScreen.css';

export default function HomeScreen({ workouts, onStart, onManage, onHistory, onStats, sheetsConfigured, onConnect }) {
  return (
    <div className="home">
      <h1 className="home-title mono">FITLOG</h1>
      {!sheetsConfigured && <SetupBanner onConnect={onConnect} />}
      <div className="workout-list">
        {workouts.map((w) => (
          <div key={w.id} className={`workout-card border-${w.color}`}>
            <span className={`workout-card-label mono accent-${w.color}`}>{w.label}</span>
            <button className={`start-btn workout-${w.color}`} onClick={() => onStart(w.id)}>
              START
            </button>
          </div>
        ))}
      </div>
      <div className="home-footer-btns">
        <button className="manage-routines-btn mono" onClick={onManage}>
          MANAGE ROUTINES
        </button>
        <button className="history-btn mono" onClick={onStats}>
          VIEW STATS
        </button>
        <button className="history-btn mono" onClick={onHistory}>
          VIEW HISTORY
        </button>
      </div>
    </div>
  );
}
