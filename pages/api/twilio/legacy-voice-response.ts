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

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const twimlSuccess = `<Response><Say voice="alice">Thank you. Your response has been recorded and your check-in schedule has been reset.</Say></Response>`;
  const twimlFail = `<Response><Say voice="alice">We did not receive a valid response. Our team will continue to monitor your status.</Say></Response>`;

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(405).send(`<Response><Say voice="alice">Method not allowed.</Say></Response>`);
  }

  const digits = req.body.Digits as string | undefined;
  const fromPhone = req.body.From as string | undefined;

  if (!fromPhone || digits !== '1') {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twimlFail);
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('phone', fromPhone)
    .single();

  if (!user) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twimlFail);
  }

  const { data: schedule } = await supabaseAdmin
    .from(SCHEDULES_TABLE)
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('next_check_in_at', { ascending: true })
    .limit(1)
    .single();

  if (!schedule) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twimlFail);
  }

  const nextCheckInAt = calculateNextCheckIn(schedule);

  await supabaseAdmin.from(SCHEDULES_TABLE).update({
    last_check_in_at: new Date().toISOString(),
    next_check_in_at: nextCheckInAt,
    current_status: 'confirmed',
    escalation_step: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', schedule.id);

  await logCheckInEvent(user.id, schedule.id, 'check_in_confirmed', 'ok', schedule.escalation_step, 'Legacy voice confirmation from Twilio');

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twimlSuccess);
}
