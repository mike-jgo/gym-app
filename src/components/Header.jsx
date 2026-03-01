import React from 'react';
import './Header.css';

export default function Header({ workout, syncStatus }) {
  return (
    <div className="header">
      <h1 className="header-title mono">
        FBEOD <span className={`accent-${workout.toLowerCase()}`}>{workout}</span>
      </h1>
      <div className="header-right">
        <span className="bw-badge mono">BW 64.5 kg</span>
        <div
          className={`sync-dot ${syncStatus}`}
          title={`Sheets: ${syncStatus}`}
        />
      </div>
    </div>
  );
}
