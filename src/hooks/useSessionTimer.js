import { useState, useEffect, useRef } from 'react';

export function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0); // seconds
  const startRef = useRef(null);
  const intervalRef = useRef(null);

  const start = () => {
    startRef.current = Date.now();
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  };

  // Returns elapsed seconds and stops the interval
  const stop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (!startRef.current) return 0;
    return Math.floor((Date.now() - startRef.current) / 1000);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    startRef.current = null;
    setElapsed(0);
  };

  // Clean up on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  return { elapsed, start, stop, reset };
}
