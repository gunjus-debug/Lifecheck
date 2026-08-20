import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { logCheckInEvent } from '../../../lib/escalation';

const SCHEDULES_TABLE = 'check_in_schedules';

function calculateNextCheckIn(schedule: any): string {
  const baseDate = new Date();
  switch (schedule.frequency) {
    case 'daily':
      baseDate.setDate(baseDate.getDate() + schedule.interval);
      break;
    case 'weekly':
      baseDate.setDate(baseDate.getDate() + schedule.interval * 7);
      break;
    case 'monthly':
      baseDate.setMonth(baseDate.getMonth() + schedule.interval);
      break;
    case 'quarterly':
      baseDate.setMonth(baseDate.getMonth() + schedule.interval * 3);
      break;
    default:
      baseDate.setDate(baseDate.getDate() + 30);
  }
  return baseDate.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, scheduleId, responseType = 'ok', token } = req.body as {
    userId?: string;
    scheduleId?: string;
    responseType?: 'ok' | 'help';
    token?: string;
  };

  if (!scheduleId && !token) {
    return res.status(400).json({ error: 'Missing scheduleId or token' });
  }

  let resolvedUserId = userId;
  let resolvedScheduleId = scheduleId;

  if (token) {
    const now = new Date().toISOString();
    const { data: tokenRow, error: tokenError } = await supabaseAdmin
      .from('vault_access_tokens')
      .select('*')
      .eq('token', token)
      .eq('purpose', 'check_in_link')
      .eq('used', false)
      .gte('expires_at', now)
      .single();

    if (tokenError || !tokenRow) {
      return res.status(400).json({ error: 'Invalid or expired link token' });
    }

    resolvedUserId = tokenRow.user_id;
    // support both snake_case and camelCase metadata keys depending on how seeds were inserted
    resolvedScheduleId = resolvedScheduleId || tokenRow.metadata?.schedule_id || tokenRow.metadata?.scheduleId;

    if (!resolvedScheduleId) {
      return res.status(400).json({ error: 'Unable to identify schedule for token' });
    }

    await supabaseAdmin.from('vault_access_tokens').update({ used: true }).eq('id', tokenRow.id);
  }

  if (!resolvedUserId || !resolvedScheduleId) {
    return res.status(400).json({ error: 'Missing userId or scheduleId' });
  }

  // Ensure app user exists (create minimal if needed)
  try {
    const { ensureUserExists } = await import('../../../lib/users');
    await ensureUserExists(resolvedUserId, { createMinimal: true });
  } catch (e) {
    // non-fatal
  }

  const { data: schedule, error: scheduleError } = await supabaseAdmin
    .from(SCHEDULES_TABLE)
    .select('*')
    .eq('id', resolvedScheduleId)
    .eq('user_id', resolvedUserId)
    .single();

  if (scheduleError || !schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  if (schedule.paused_until && new Date(schedule.paused_until) > new Date()) {
    return res.status(400).json({ error: 'Check-ins are currently paused' });
  }

  const nextCheckInAt = calculateNextCheckIn(schedule);

  const scheduleIdToUpdate = resolvedScheduleId;
  const userIdToLog = resolvedUserId;

  const { error: updateError } = await supabaseAdmin.from(SCHEDULES_TABLE).update({
    last_check_in_at: new Date().toISOString(),
    next_check_in_at: nextCheckInAt,
    current_status: 'confirmed',
    escalation_step: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', scheduleIdToUpdate);

  if (updateError) {
    return res.status(500).json({ error: 'Unable to update schedule' });
  }

  await logCheckInEvent(
    userIdToLog,
    scheduleIdToUpdate,
    'check_in_confirmed',
    responseType === 'ok' ? 'ok' : 'help_requested',
    schedule.escalation_step,
    `User confirmed via ${responseType}`,
    { responseType }
  );

  return res.status(200).json({
    message: 'Check-in confirmed',
    next_check_in_at: nextCheckInAt,
  });
}
