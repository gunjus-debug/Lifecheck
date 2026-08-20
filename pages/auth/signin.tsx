'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseBrowser';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: _event, session: newSession }),
        });
      } catch (e) {
        // ignore network errors; cookie-sync may be retried by client
      }
    });

    return () => subscription?.subscription.unsubscribe();
  }, []);

  async function handleEmailLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your inbox for a login link.');
    }

    setLoading(false);
  }

  async function handleGithubLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' });
    if (error) {
      setMessage(error.message);
    }
    setLoading(false);
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message);
    } else {
      setSession(null);
      setMessage('Signed out successfully.');
    }
  }

  return (
    <main className="page">
      <div className="card">
        <h1>Sign In</h1>
        {session?.user ? (
          <div>
            <p>Signed in as {session.user.email || session.user.phone}</p>
            <button onClick={handleSignOut}>Sign out</button>
          </div>
        ) : (
          <>
            <form onSubmit={handleEmailLogin} className="form">
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </label>
              <button type="submit" disabled={loading}>
                {loading ? 'Sending link…' : 'Send login link'}
              </button>
            </form>
            <div className="divider">or</div>
            <button onClick={handleGithubLogin} disabled={loading}>
              Continue with GitHub
            </button>
          </>
        )}
        {message ? <p className="message">{message}</p> : null}
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          background: #020617;
        }
        .card {
          width: min(100%, 420px);
          padding: 2rem;
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.16);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
        }
        h1 {
          margin-top: 0;
          margin-bottom: 1rem;
        }
        .form {
          display: grid;
          gap: 1rem;
        }
        label {
          font-size: 0.95rem;
          display: grid;
          gap: 0.5rem;
        }
        input {
          width: 100%;
          padding: 0.95rem 1rem;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: #020617;
          color: #e2e8f0;
        }
        button {
          width: 100%;
          padding: 0.95rem 1rem;
          border-radius: 16px;
          border: none;
          background: #38bdf8;
          color: #020617;
          font-weight: 700;
          cursor: pointer;
        }
        .divider {
          text-align: center;
          margin: 1rem 0;
          color: rgba(226, 232, 240, 0.75);
        }
        .message {
          margin-top: 1rem;
          color: #cbd5e1;
        }
      `}</style>
    </main>
  );
}
