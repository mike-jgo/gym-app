import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export function useAuth() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setMagicLinkSent(false);
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

  return { session, loading: session === undefined, magicLinkSent, sendMagicLink, signOut };
}
