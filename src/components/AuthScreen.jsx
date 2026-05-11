import React, { useState } from 'react';

export default function AuthScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSending(true);
    setError('');
    try {
      await onSignIn(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 bg-bg">
      <h1 className="font-mono text-4xl font-extrabold tracking-[0.25em] text-text mb-12">
        FITLOG
      </h1>

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
        <label className="font-mono text-[0.7rem] tracking-widest text-muted mt-2" htmlFor="auth-password">
          PASSWORD
        </label>
        <input
          id="auth-password"
          className="w-full px-4 py-3 bg-surface border border-line rounded-lg text-text text-base font-sans outline-none focus:border-[var(--accent-a)] box-border"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          required
        />
        {error && <p className="text-sm text-red m-0">{error}</p>}
        <button
          className="mt-2 py-[0.85rem] bg-[var(--accent-a)] text-bg font-mono text-[0.8rem] tracking-widest font-bold rounded-lg border-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          type="submit"
          disabled={sending || !email.trim() || !password}
        >
          {sending ? 'SIGNING IN...' : 'SIGN IN'}
        </button>
      </form>
    </div>
  );
}
