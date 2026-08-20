import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { logCheckInEvent } from '../../../lib/escalation';

const SCHEDULES_TABLE = 'check_in_schedules';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, scheduleId, pauseDays, reason } = req.body as {
    userId?: string;
    scheduleId?: string;
    pauseDays?: number;
    reason?: string;
  };

  if (!userId || !scheduleId || !pauseDays || pauseDays <= 0) {
    return res.status(400).json({ error: 'Missing or invalid pause parameters' });
  }

  // Ensure app user exists
  try {
    const { ensureUserExists } = await import('../../../lib/users');
    await ensureUserExists(userId, { createMinimal: true });
  } catch (e) {
    // non-fatal
  }

  const pausedUntil = new Date();
  pausedUntil.setDate(pausedUntil.getDate() + pauseDays);

  const { error } = await supabaseAdmin.from(SCHEDULES_TABLE).update({
    paused_until: pausedUntil.toISOString(),
    vacation_reason: reason || 'Vacation mode',
    current_status: 'paused',
    updated_at: new Date().toISOString(),
  }).eq('id', scheduleId).eq('user_id', userId);

  if (error) {
    return res.status(500).json({ error: 'Unable to pause schedule' });
  }

  await logCheckInEvent(
    userId,
    scheduleId,
    'pause_set',
    'paused',
    0,
    `Paused for ${pauseDays} day(s): ${reason || 'Vacation mode'}`,
    null
  );

  return res.status(200).json({
    message: 'Check-in schedule paused',
    paused_until: pausedUntil.toISOString(),
  });
}
