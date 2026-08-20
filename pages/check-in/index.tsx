import { createServerSupabase } from '../../lib/supabaseServer';
import CheckInDashboardClient from '../../components/CheckInDashboardClient';
import CheckInDashboardClientWrapper from '../../components/CheckInDashboardClientWrapper';
import type { GetServerSideProps } from 'next';

export default function CheckInPage({ schedules, userId }: { schedules: any[]; userId: string | null }) {
  // If userId is present (SSR authenticated), render dashboard with initial schedules.
  if (userId) {
    return <CheckInDashboardClient schedules={schedules} userId={userId} />;
  }

  // Otherwise fall back to a client-side wrapper that will obtain the session via the
  // browser Supabase client and render the dashboard. This is a development/workaround
  // when server cookies are not yet synchronized.
  return <CheckInDashboardClientWrapper />;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerSupabase(ctx);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session || !session.user) {
    // Do not redirect in the fallback mode; return empty props so the client wrapper
    // can attempt to hydrate the session from the browser SDK.
    return {
      props: {
        schedules: [],
        userId: null,
      },
    };
  }
  // Ensure a corresponding application `users` row exists for this auth user.
  // Use upsert so repeated calls are idempotent.
  try {
    await supabase.from('users').upsert([
      {
        id: session.user.id,
        email: session.user.email ?? null,
        full_name: session.user.user_metadata?.full_name ?? session.user.email ?? 'User',
      },
    ]);
  } catch (e) {
    // Non-fatal for rendering; log for debugging.
    // eslint-disable-next-line no-console
    console.warn('failed to upsert users row for session user', e);
  }

  const { data: schedules, error } = await supabase
    .from('check_in_schedules')
    .select('*')
    .eq('user_id', session.user.id)
    .order('next_check_in_at', { ascending: true });

  return {
    props: {
      schedules: error ? [] : schedules ?? [],
      userId: session.user.id,
    },
  };
};
