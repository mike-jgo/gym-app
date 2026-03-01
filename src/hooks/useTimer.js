import { useState, useRef, useCallback } from 'react';

const REST_DURATION = 90; // seconds

export function useTimer() {
  const [seconds, setSeconds] = useState(REST_DURATION);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    setSeconds(REST_DURATION);
    setRunning(true);
    setFinished(false);

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setFinished(true);
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setFinished(false);
    setSeconds(REST_DURATION);
  }, []);

  const toggle = useCallback(() => {
    if (running) stop();
    else start();
  }, [running, start, stop]);

  const percent = ((REST_DURATION - seconds) / REST_DURATION) * 100;
  const display = finished
    ? 'GO!'
    : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return { seconds, running, finished, display, percent, toggle };
}
