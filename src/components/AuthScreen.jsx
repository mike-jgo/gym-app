import React, { useState, useEffect, useRef } from 'react';

const COOLDOWN_SECONDS = 60;

export default function AuthScreen({ onSendMagicLink, magicLinkSent, returnToApp }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError('');
    try {
      await onSendMagicLink(email.trim());
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message || 'Failed to send link');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <h1 className="font-mono text-4xl font-extrabold tracking-[0.25em] text-text mb-12">
        FITLOG
      </h1>

      {returnToApp ? (
        <div className="flex flex-col items-center gap-4 max-w-[280px] text-center">
          <p className="text-text font-mono text-sm tracking-wide">YOU'RE SIGNED IN</p>
          <p className="text-muted text-sm leading-relaxed">
            Open the app from your home screen to continue.
          </p>
        </div>
      ) : magicLinkSent ? (
        <div className="flex flex-col items-center gap-6 max-w-[280px] text-center">
          <p className="text-muted leading-relaxed">
            Check your email for a magic link to sign in.
          </p>
          <button
            className="font-mono text-xs tracking-widest text-[var(--accent-a)] border border-[var(--accent-a)] rounded-lg px-5 py-2.5 bg-transparent cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `RESEND IN ${cooldown}s` : 'RESEND'}
          </button>
        </div>
      ) : (
        <form className="flex flex-col gap-3 w-full max-w-xs" onSubmit={handleSubmit}>
          <label className="font-mono text-[0.7rem] tracking-widest text-muted" htmlFor="auth-email">
            EMAIL
          </label>
          <input
            id="auth-email"
            className="w-full px-4 py-3 bg-surface border border-line rounded-lg text-text text-base font-sans outline-none focus:border-[var(--accent-a)] box-border"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          {error && <p className="text-sm text-red m-0">{error}</p>}
          <button
            className="mt-2 py-[0.85rem] bg-[var(--accent-a)] text-bg font-mono text-[0.8rem] tracking-widest font-bold rounded-lg border-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            type="submit"
            disabled={sending || !email.trim()}
          >
            {sending ? 'SENDING...' : 'SEND MAGIC LINK'}
          </button>
        </form>
      )}
    </div>
  );
}
