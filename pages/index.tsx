import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>LifeCheck</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="page-shell">
        <section className="hero">
          <h1>LifeCheck</h1>
          <p>Automated check-ins for legacy planning and elder care.</p>
          <div className="card-grid">
            <Link href="/vault-access" className="card">
              <h2>Vault Access</h2>
              <p>Secure beneficiary retrieval with multi-factor verification.</p>
            </Link>
            <Link href="/check-in" className="card">
              <h2>Daily &amp; Legacy Check-ins</h2>
              <p>Respond to your latest scheduled check-in or pause while on vacation.</p>
            </Link>
          </div>
        </section>
      </main>
      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
          color: white;
        }
        .hero {
          width: min(100%, 680px);
          text-align: center;
        }
        h1 {
          font-size: clamp(2.4rem, 5vw, 4rem);
          margin-bottom: 0.8rem;
        }
        p {
          font-size: 1.05rem;
          opacity: 0.8;
          margin-bottom: 2rem;
        }
        .card-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .card {
          display: block;
          padding: 1.25rem;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(148, 163, 184, 0.18);
          transition: transform 0.15s ease, background 0.15s ease;
          text-decoration: none;
          color: inherit;
        }
        .card:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.1);
        }
        .card h2 {
          margin: 0 0 0.75rem;
          font-size: 1.25rem;
        }
      `}</style>
    </>
  );
}
