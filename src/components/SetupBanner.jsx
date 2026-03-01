import React, { useState } from 'react';
import './SetupBanner.css';

export default function SetupBanner({ onConnect }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!url.trim()) return;
    setLoading(true);
    const success = await onConnect(url.trim());
    setLoading(false);
  };

  return (
    <div className="setup-banner">
      <h3 className="mono">⚡ CONNECT GOOGLE SHEETS</h3>
      <p>
        Paste your Google Apps Script Web App URL to enable cloud sync.
        Your workout data will be stored safely in Google Sheets.
      </p>
      <input
        className="setup-input mono"
        placeholder="https://script.google.com/macros/s/..../exec"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        className="setup-save"
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? 'CONNECTING...' : 'CONNECT'}
      </button>
    </div>
  );
}
