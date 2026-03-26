import React, { useEffect } from 'react';

export default function Toast({ message, isError, onDone }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => { if (onDone) onDone(); }, 2400);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className={[
      'fixed left-1/2 z-50 pointer-events-none',
      'bottom-[calc(var(--safe-bottom)+24px)]',
      'px-6 py-3 rounded-xl font-bold text-sm',
      'animate-toast',
      isError ? 'bg-red text-white' : 'bg-green text-bg',
    ].join(' ')}>
      {message}
    </div>
  );
}
