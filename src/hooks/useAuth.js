import { useState, useEffect } from 'react';
import { getMe, login, logout } from '../utils/api';

export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(({ user }) => {
        if (!cancelled) setSession({ user });
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => { cancelled = true; };
  }, []);

  const signIn = async (email, password) => {
    const { user } = await login(email, password);
    setSession({ user });
  };

  const signOut = async () => {
    await logout();
    setSession(null);
  };

  return { session, loading: session === undefined, signIn, signOut };
}
