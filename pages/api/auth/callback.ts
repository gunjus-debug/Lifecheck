import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { access_token } = req.query;

  if (!access_token || typeof access_token !== 'string') {
    return res.status(400).json({ error: 'Missing access token' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(access_token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Unable to validate access token' });
  }

  return res.status(200).json({ user: data.user });
}
