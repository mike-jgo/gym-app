import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

// navigator.standalone is iOS-only: true = PWA, false = Safari, undefined = non-iOS
const isPWA = () => window.navigator.standalone === true;
const isIOSSafari = () => window.navigator.standalone === false;

const COOKIE_PATH = import.meta.env.BASE_URL || '/';
const COOKIE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function writeAuthCookies(session) {
  const expires = new Date(Date.now() + COOKIE_TTL_MS).toUTCString();
  const flags = `expires=${expires}; path=${COOKIE_PATH}; SameSite=Strict`;
  document.cookie = `pwa_at=${session.access_token}; ${flags}`;
  document.cookie = `pwa_rt=${session.refresh_token}; ${flags}`;
}

function readAuthCookies() {
  const map = Object.fromEntries(
    document.cookie.split('; ').filter(Boolean).map((c) => c.split('='))
  );
  return map.pwa_at && map.pwa_rt
    ? { access_token: map.pwa_at, refresh_token: map.pwa_rt }
    : null;
}

function clearAuthCookies() {
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = `pwa_at=; ${expired}; path=${COOKIE_PATH}; SameSite=Strict`;
  document.cookie = `pwa_rt=; ${expired}; path=${COOKIE_PATH}; SameSite=Strict`;
}

export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [returnToApp, setReturnToApp] = useState(false);

  useEffect(() => {
    // If running as PWA, check for cookie-bridged tokens from Safari auth
    if (isPWA()) {
      const tokens = readAuthCookies();
      if (tokens) {
        clearAuthCookies();
        supabase.auth.setSession(tokens); // triggers onAuthStateChange below
        return;
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setMagicLinkSent(false);
        // Auth completed in Safari — bridge tokens to the PWA via cookies
        if (isIOSSafari()) {
          writeAuthCookies(session);
          setReturnToApp(true);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendMagicLink = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) throw error;
    setMagicLinkSent(true);
  };

  const signOut = () => supabase.auth.signOut();

  return { session, loading: session === undefined, magicLinkSent, sendMagicLink, signOut, returnToApp };
}
