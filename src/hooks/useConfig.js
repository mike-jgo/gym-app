import { useState, useEffect, useCallback } from 'react';
import {
  loadConfigFromStorage,
  saveConfigToStorage,
  fetchConfigFromSupabase,
  saveConfig as persistConfig,
  seedDefaultWorkouts,
} from '../utils/config';

export function useConfig(session) {
  const [config, setConfig] = useState(null);
  const [configStatus, setConfigStatus] = useState('loading');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const userId = session.user.id;

    async function load() {
      // 1. Show cached config immediately for fast first paint (only if same user)
      const local = loadConfigFromStorage(userId);
      if (local && !cancelled) {
        setConfig(local);
        setConfigStatus('ready');
      }

      // 2. Fetch authoritative config from Supabase
      try {
        const remote = await fetchConfigFromSupabase();

        if (cancelled) return;

        if (remote.workouts.length === 0) {
          // New user — seed default workouts A & B
          await seedDefaultWorkouts();
          const seeded = await fetchConfigFromSupabase();
          if (!cancelled) {
            setConfig(seeded);
            saveConfigToStorage(seeded, userId);
            setConfigStatus('ready');
          }
        } else {
          setConfig(remote);
          saveConfigToStorage(remote, userId);
          setConfigStatus('ready');
        }
      } catch {
        // Supabase unavailable — local cache already shown if it existed.
        // Don't fall back to DEFAULT_WORKOUTS: an existing user seeing default
        // workouts could mistakenly log a session on the wrong workout.
        if (!cancelled && !local) {
          setConfigStatus('error');
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [session]);

  const saveConfig = useCallback((newConfig) => {
    const userId = session?.user?.id;
    setConfig(newConfig);
    saveConfigToStorage(newConfig, userId);
    persistConfig(newConfig, userId).catch(() => {
      setConfigStatus('error');
    });
  }, [session]);

  return { config, configStatus, saveConfig };
}
