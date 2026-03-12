import { useState, useRef, useCallback, useEffect } from 'react';

const REST_DURATION = 90; // seconds

async function requestNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function swMessage(type, extra = {}) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type, ...extra });
  });
}

export function useTimer() {
  const [seconds, setSeconds] = useState(REST_DURATION);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);
  const runningRef = useRef(false); // stable ref for event listeners

  const finish = useCallback(() => {
    clearInterval(intervalRef.current);
    endTimeRef.current = null;
    runningRef.current = false;
    setRunning(false);
    setFinished(true);
    setSeconds(0);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  }, []);

  const startInterval = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        finish();
      } else {
        setSeconds(remaining);
      }
    }, 500);
  }, [finish]);

  const start = useCallback(async () => {
    await requestNotifPermission();
    endTimeRef.current = Date.now() + REST_DURATION * 1000;
    runningRef.current = true;
    setSeconds(REST_DURATION);
    setRunning(true);
    setFinished(false);
    startInterval();
  }, [startInterval]);

  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    endTimeRef.current = null;
    runningRef.current = false;
    swMessage('CANCEL_NOTIF');
    setRunning(false);
    setFinished(false);
    setSeconds(REST_DURATION);
  }, []);

  const toggle = useCallback(() => {
    if (runningRef.current) stop();
    else start();
  }, [start, stop]);

  // Pause interval when hidden, resume (or finish) when visible
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!runningRef.current || !endTimeRef.current) return;

      if (document.hidden) {
        // Stop JS interval — rely on wall-clock + SW notification
        clearInterval(intervalRef.current);
        const delayMs = endTimeRef.current - Date.now();
        if (delayMs > 0) {
          swMessage('SCHEDULE_NOTIF', { delayMs });
        }
      } else {
        // App foregrounded — cancel the notification
        swMessage('CANCEL_NOTIF');
        const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          finish();
        } else {
          setSeconds(remaining);
          startInterval();
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [finish, startInterval]);

  // Clean up on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const percent = ((REST_DURATION - seconds) / REST_DURATION) * 100;
  const display = finished
    ? 'GO!'
    : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return { seconds, running, finished, display, percent, toggle };
}
