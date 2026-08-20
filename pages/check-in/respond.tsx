import type { GetServerSideProps } from 'next';
import { createServerSupabase } from '../../lib/supabaseServer';

interface SecureCheckInProps {
  token: string;
  scheduleId: string;
  valid: boolean;
}

export default function SecureCheckIn({ token, scheduleId, valid }: SecureCheckInProps) {
  return (
    <main className="page">
      <section className="card">
        <h1>Secure Check-In</h1>
        <p>{valid ? 'Please confirm your status with the secure button below.' : 'This check-in link is invalid or has expired.'}</p>

        {valid ? (
          <form action="/api/check-in/respond" method="post">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="scheduleId" value={scheduleId} />
            <input type="hidden" name="responseType" value="ok" />
            <button type="submit">Confirm I&apos;m OK</button>
          </form>
        ) : null}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          background: #020617;
          color: #e2e8f0;
        }
        .card {
          width: min(100%, 420px);
          padding: 2rem;
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.16);
        }
        button {
          margin-top: 1rem;
          width: 100%;
          padding: 0.95rem 1rem;
          border: none;
          border-radius: 16px;
          background: #38bdf8;
          color: #020617;
          font-weight: 700;
          cursor: pointer;
        }
      `}</style>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = ctx.query.token as string | undefined;
  const scheduleId = ctx.query.scheduleId as string | undefined;

  if (!token || !scheduleId) {
    return { props: { token: '', scheduleId: '', valid: false } };
  }

  const supabase = createServerSupabase(ctx);
  const now = new Date().toISOString();
  const { data: tokenRow, error } = await supabase
    .from('vault_access_tokens')
    .select('id, expires_at, used, metadata')
    .eq('token', token)
    .eq('purpose', 'check_in_link')
    .single();

  if (error || !tokenRow || tokenRow.used || tokenRow.expires_at < now) {
    return { props: { token, scheduleId, valid: false } };
  }

  return { props: { token, scheduleId, valid: true } };
};
