'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseBrowser';
import CheckInDashboardClient, { ScheduleItem } from './CheckInDashboardClient';

export default function CheckInDashboardClientWrapper() {
  const [session, setSession] = useState<any | null>(null);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(current);

      if (current?.user) {
        const res = await fetch('/api/check-in/schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: current.user.id }),
        });
        if (res.ok) {
          const js = await res.json();
          setSchedules(js.schedules || []);
        }
      }
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading…</div>;

  if (!session?.user) {
    return (
      <div className="page">
        <section className="card">
          <h1>Sign in to manage schedules</h1>
          <p>Please sign in to create and manage check-in schedules.</p>
          <a href="/auth/signin">Sign in</a>
        </section>
      </div>
    );
  }

  return <CheckInDashboardClient schedules={schedules} userId={session.user.id} userEmail={session.user.email} userFullName={session.user.user_metadata?.full_name} />;
}
