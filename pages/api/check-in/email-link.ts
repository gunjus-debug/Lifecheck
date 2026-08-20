import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';
import { sendEmail } from '../../../lib/messaging';

const CHECKIN_LINK_EXPIRY_MINUTES = 120;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, scheduleId, email } = req.body as { userId?: string; scheduleId?: string; email?: string };

  if (!userId || !scheduleId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CHECKIN_LINK_EXPIRY_MINUTES);

  await supabaseAdmin.from('vault_access_tokens').insert({
    user_id: userId,
    purpose: 'check_in_link',
    token,
    otp_code: null,
    expires_at: expiresAt.toISOString(),
    used: false,
    metadata: { schedule_id: scheduleId },
  });

  const link = `${process.env.APP_URL}/check-in/respond?token=${token}&scheduleId=${scheduleId}`;

  await sendEmail(email, 'Your LifeCheck check-in link', `<p>Please confirm your status with the link below:</p><p><a href="${link}">${link}</a></p>`);

  return res.status(200).json({ message: 'Email sent' });
}
