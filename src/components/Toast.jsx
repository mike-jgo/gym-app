import React, { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, isError, onDone }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onDone) onDone();
    }, 2400);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className={`toast show ${isError ? 'error' : ''}`}>
      {message}
    </div>
  );
}
