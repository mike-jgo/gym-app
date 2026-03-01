import { useState, useEffect, useCallback } from 'react';
import { getApiUrl, setApiUrl, saveWorkout, fetchLastLifts } from '../utils/sheets';

export function useSheets() {
  const [status, setStatus] = useState('disconnected'); // disconnected | syncing | connected | error
  const [lastLifts, setLastLifts] = useState({});
  const [configured, setConfigured] = useState(!!getApiUrl());

  const loadData = useCallback(async () => {
    const url = getApiUrl();
    if (!url) {
      setStatus('disconnected');
      setConfigured(false);
      return;
    }

    setStatus('syncing');
    try {
      const data = await fetchLastLifts();
      setLastLifts(data);
      setStatus('connected');
      setConfigured(true);
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const connect = useCallback(async (url) => {
    setApiUrl(url);
    setConfigured(true);
    setStatus('syncing');
    try {
      const data = await fetchLastLifts();
      setLastLifts(data);
      setStatus('connected');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, []);

  const save = useCallback(async (payload) => {
    setStatus('syncing');
    try {
      await saveWorkout(payload);
      const data = await fetchLastLifts();
      setLastLifts(data);
      setStatus('connected');
      return true;
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, []);

  return { status, lastLifts, configured, connect, save, reload: loadData };
}
