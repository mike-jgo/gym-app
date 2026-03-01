import React from 'react';
import './WorkoutSelector.css';

export default function WorkoutSelector({ workouts, currentId, onSelect, onManage }) {
  return (
    <div className="selector-row">
      {workouts.map((w) => (
        <button
          key={w.id}
          className={`selector-pill${currentId === w.id ? ` active accent-${w.color}` : ''}`}
          onClick={() => onSelect(w.id)}
        >
          {w.label}
        </button>
      ))}
      <button className="selector-pill manage-btn" onClick={onManage}>
        MANAGE
      </button>
    </div>
  );
}
