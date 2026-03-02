import { useState, useEffect, useCallback, useRef } from 'react';
import { calc1RM } from '../utils/calc';
import { getApiUrl, setApiUrl, saveWorkout, fetchLastLifts, fetchAllData, fetchPBs } from '../utils/sheets';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function computePersonalBests(rows) {
  const pbs = {};

  rows.forEach((row) => {
    const exId = String(row.ExerciseID || '').trim();
    if (!exId) return;

    const weight = toNumber(row.Weight);
    const reps = parseInt(row.Reps, 10) || 0;
    const e1rm = toNumber(row.e1RM) || calc1RM(weight, reps);
    const volumeLoad = toNumber(row.VolumeLoad) || (weight * reps);
    const date = String(row.Date || '');

    if (!pbs[exId]) {
      pbs[exId] = {
        best1RM: 0,
        best1RMDate: '',
        bestWeight: 0,
        bestWeightReps: 0,
        bestWeightDate: '',
        bestVolume: 0,
        bestVolumeDate: '',
      };
    }

    const current = pbs[exId];

    if (e1rm > current.best1RM) {
      current.best1RM = Math.round(e1rm * 10) / 10;
      current.best1RMDate = date;
    }

    if (weight > current.bestWeight) {
      current.bestWeight = weight;
      current.bestWeightReps = reps;
      current.bestWeightDate = date;
    }

    if (volumeLoad > current.bestVolume) {
      current.bestVolume = Math.round(volumeLoad * 10) / 10;
      current.bestVolumeDate = date;
    }
  });

  return pbs;
}

export function useSheets() {
  const [status, setStatus] = useState('disconnected'); // disconnected | syncing | connected | error
  const [lastLifts, setLastLifts] = useState({});
  const [personalBests, setPersonalBests] = useState({});
  const [configured, setConfigured] = useState(!!getApiUrl());
  const pbFetchModeRef = useRef('auto'); // auto | pbs | legacy

  const fetchPersonalBests = useCallback(async () => {
    if (pbFetchModeRef.current === 'pbs') {
      return fetchPBs();
    }

    if (pbFetchModeRef.current === 'legacy') {
      const logData = await fetchAllData();
      return computePersonalBests(logData);
    }

    try {
      const data = await fetchPBs();
      pbFetchModeRef.current = 'pbs';
      return data;
    } catch {
      pbFetchModeRef.current = 'legacy';
      const logData = await fetchAllData();
      return computePersonalBests(logData);
    }
  }, []);

  const loadData = useCallback(async () => {
    const url = getApiUrl();
    if (!url) {
      setStatus('disconnected');
      setConfigured(false);
      return;
    }

    setStatus('syncing');
    try {
      const [lastData, pbData] = await Promise.all([
        fetchLastLifts(),
        fetchPersonalBests(),
      ]);
      setLastLifts(lastData);
      setPersonalBests(pbData);
      setStatus('connected');
      setConfigured(true);
    } catch {
      setStatus('error');
    }
  }, [fetchPersonalBests]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const connect = useCallback(async (url) => {
    setApiUrl(url);
    setConfigured(true);
    setStatus('syncing');
    try {
      const [lastData, pbData] = await Promise.all([
        fetchLastLifts(),
        fetchPersonalBests(),
      ]);
      setLastLifts(lastData);
      setPersonalBests(pbData);
      setStatus('connected');
      return true;
    } catch {
      setStatus('error');
      return false;
    }
  }, [fetchPersonalBests]);

  const save = useCallback(async (payload) => {
    setStatus('syncing');
    try {
      await saveWorkout(payload);
      const [lastData, pbData] = await Promise.all([
        fetchLastLifts(),
        fetchPersonalBests(),
      ]);
      setLastLifts(lastData);
      setPersonalBests(pbData);
      setStatus('connected');
      return true;
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, [fetchPersonalBests]);

  return { status, lastLifts, personalBests, configured, connect, save, reload: loadData };
}
