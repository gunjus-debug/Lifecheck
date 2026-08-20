import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { userId, full_name, phone, email, relationship, role } = req.body as any;
  if (!userId || !full_name) return res.status(400).json({ error: 'Missing required fields' });
  const { email: userEmail, full_name: userFullName } = req.body as any;

  // Ensure the application-level user exists.
  const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('id', userId).single();
  if (!existingUser) {
    // Allow creating a minimal user if we have at least email or full_name
    if (!userEmail && !userFullName) return res.status(400).json({ error: 'Missing user record; please provide at least email or full_name to create user' });
    const insertFullName = userFullName ?? userEmail ?? 'User';
    const { error: userErr } = await supabaseAdmin.from('users').insert({ id: userId, email: userEmail ?? null, full_name: insertFullName });
    if (userErr) return res.status(500).json({ error: userErr.message });
  }

  const payload = { user_id: userId, full_name, phone, email, relationship, role: role || 'human_verifier', is_primary: false };
  const { data, error } = await supabaseAdmin.from('contacts').insert(payload).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ contact: data });
}
