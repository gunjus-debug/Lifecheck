import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body as { userId?: string };

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  // Ensure app user row exists to avoid FK surprises
  try {
    // create a minimal user row if missing
    const { ensureUserExists } = await import('../../../lib/users');
    await ensureUserExists(userId, { createMinimal: true });
  } catch (e) {
    // non-fatal
  }

  const { data: schedules, error } = await supabaseAdmin
    .from('check_in_schedules')
    .select('*')
    .eq('user_id', userId)
    .order('next_check_in_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ schedules: schedules ?? [] });
}
