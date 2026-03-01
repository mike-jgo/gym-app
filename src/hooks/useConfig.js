import { useState, useEffect, useCallback } from 'react';
import {
  buildDefaultConfig,
  loadConfigFromStorage,
  saveConfigToStorage,
  fetchConfigFromSheets,
  saveConfigToSheets,
} from '../utils/config';
import { getApiUrl } from '../utils/sheets';

export function useConfig() {
  const [config, setConfig] = useState(null);
  const [configStatus, setConfigStatus] = useState('loading'); // loading | ready

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Try localStorage immediately
      const local = loadConfigFromStorage();
      if (local && !cancelled) {
        setConfig(local);
        setConfigStatus('ready');
      }

      // 2. Try Sheets if configured
      if (getApiUrl()) {
        const remote = await fetchConfigFromSheets();
        if (remote && !cancelled) {
          setConfig(remote);
          saveConfigToStorage(remote);
          setConfigStatus('ready');
          return;
        }
      }

      // 3. Fall back to defaults
      if (!cancelled && !local) {
        const defaults = buildDefaultConfig();
        setConfig(defaults);
        saveConfigToStorage(defaults);
        setConfigStatus('ready');
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const saveConfig = useCallback((newConfig) => {
    saveConfigToStorage(newConfig);
    setConfig(newConfig);
    if (getApiUrl()) {
      saveConfigToSheets(newConfig).catch(() => {});
    }
  }, []);

  return { config, configStatus, saveConfig };
}
