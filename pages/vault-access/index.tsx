import { useState } from 'react';

export default function VaultAccess() {
  const [token, setToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [vaultItems, setVaultItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/vault-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otpCode }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Verification failed');
      } else {
        setVaultItems(data.vaultItems ?? []);
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Unable to verify token. Please try again later.');
    }

    setLoading(false);
  }

  return (
    <main className="vault-shell">
      <section className="vault-card">
        <h1>Vault Access</h1>
        <p>Enter your secure token and OTP to retrieve encrypted vault details.</p>

        <form onSubmit={handleSubmit} className="vault-form">
          <label>
            Access Token
            <input
              type="text"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Enter secure token"
              required
            />
          </label>

          <label>
            OTP Code
            <input
              type="text"
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value)}
              placeholder="Enter OTP code"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify Access'}
          </button>
        </form>

        {message ? <p className="message">{message}</p> : null}

        {vaultItems.length > 0 ? (
          <div className="vault-list">
            <h2>Encrypted Vault Items</h2>
            <ul>
              {vaultItems.map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong>
                  <p>Category: {item.category}</p>
                  <pre>{item.encrypted_payload}</pre>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <style jsx>{`
        .vault-shell {
          min-height: 100vh;
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          color: #f8fafc;
        }
        .vault-card {
          width: min(100%, 600px);
          background: rgba(15, 23, 42, 0.96);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.25);
        }
        h1 {
          margin: 0 0 0.75rem;
          font-size: 2rem;
        }
        p {
          margin: 0 0 1.5rem;
          opacity: 0.85;
          line-height: 1.6;
        }
        .vault-form {
          display: grid;
          gap: 1rem;
        }
        label {
          display: grid;
          gap: 0.5rem;
          font-size: 0.95rem;
        }
        input {
          width: 100%;
          padding: 0.95rem 1rem;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: #020617;
          color: #f8fafc;
        }
        button {
          width: 100%;
          padding: 1rem;
          border: none;
          border-radius: 16px;
          background: #38bdf8;
          color: #020617;
          font-weight: 700;
          cursor: pointer;
        }
        .message {
          margin-top: 1rem;
          color: #cbd5e1;
        }
        .vault-list {
          margin-top: 1.75rem;
        }
        .vault-list ul {
          list-style: none;
          padding: 0;
          display: grid;
          gap: 1rem;
        }
        .vault-list li {
          padding: 1rem;
          border-radius: 18px;
          background: rgba(148, 163, 184, 0.08);
        }
        pre {
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0.75rem 0 0;
          font-size: 0.85rem;
          color: #e2e8f0;
        }
      `}</style>
    </main>
  );
}
