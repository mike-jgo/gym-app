import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchSessions,
  saveSession,
  computeLastLifts,
  computePersonalBests,
} from '../utils/supabase';

export function useSupabase(session) {
  const [status, setStatus] = useState('syncing'); // syncing | connected | saving | error
  const [lastLifts, setLastLifts] = useState({});
  const [personalBests, setPersonalBests] = useState({});
  const [sessions, setSessions] = useState([]);
  const sessionIdRef = useRef(0);

  const loadData = useCallback(async () => {
    if (!session) return;
    setStatus('syncing');
    try {
      const data = await fetchSessions();
      setSessions(data);
      setLastLifts(computeLastLifts(data));
      setPersonalBests(computePersonalBests(data));
      setStatus('connected');
    } catch {
      setStatus('error');
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = useCallback(async (payload) => {
    setStatus('syncing');
    const id = `sess_${Date.now().toString(36)}_${(++sessionIdRef.current).toString(36)}`;
    try {
      await saveSession({ ...payload, id });
      await loadData();
      return true;
    } catch (err) {
      setStatus('error');
      throw err;
    }
  }, [loadData]);

  return { status, lastLifts, personalBests, sessions, save, reload: loadData };
}
