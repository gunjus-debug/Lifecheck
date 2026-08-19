import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const { data: contacts, error } = await supabaseAdmin.from('contacts').select('id, full_name, email').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ contacts: contacts ?? [] });
}
