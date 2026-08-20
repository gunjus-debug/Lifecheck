import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, frequency, interval, startAt } = req.body as {
    userId?: string;
    frequency?: string;
    interval?: number;
    startAt?: string;
  };

  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!frequency) return res.status(400).json({ error: 'Missing frequency' });

  // Ensure the application-level `users` row exists for this auth user.
  // If missing, require `email` and `full_name` in the request body to create it.
  const { email, full_name } = req.body as { email?: string; full_name?: string };
  const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('id', userId).single();
  if (!existingUser) {
    // Allow creation when at least one of email or full_name is provided.
    if (!email && !full_name) {
      return res.status(400).json({ error: 'Missing user record; please provide at least email or full_name to create user' });
    }
    const insertFullName = full_name ?? email ?? 'User';
    const { error: userErr } = await supabaseAdmin.from('users').insert({ id: userId, email: email ?? null, full_name: insertFullName });
    if (userErr) return res.status(500).json({ error: userErr.message });
  }

  const nextDue = startAt ? new Date(startAt).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString();

  const payload = {
    user_id: userId,
    frequency,
    interval: interval ?? 1,
    next_check_in_at: nextDue,
    active: true,
  };

  // Handle contact: if contact_id provided, attach it; otherwise create a contact when email/phone provided
  const { contact_id, contact_email, contact_phone, contact_full_name, contact_relationship, contact_role } = req.body as {
    contact_id?: string;
    contact_email?: string;
    contact_phone?: string;
    contact_full_name?: string;
    contact_relationship?: string;
    contact_role?: string;
  };
  let createdContact: any = null;
  if (contact_id) {
    payload['contact_id'] = contact_id;
  } else if (contact_email || contact_phone || contact_full_name) {
    const contactPayload: any = {
      user_id: userId,
      full_name: contact_full_name ?? contact_email ?? contact_phone,
      phone: contact_phone,
      email: contact_email,
      relationship: contact_relationship,
      role: contact_role ?? 'human_verifier',
    };
    const { data: newContact, error: contactErr } = await supabaseAdmin.from('contacts').insert(contactPayload).select().single();
    if (contactErr) return res.status(500).json({ error: contactErr.message });
    payload['contact_id'] = newContact.id;
    createdContact = newContact;
  }

  const { data, error } = await supabaseAdmin.from('check_in_schedules').insert(payload).select().single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ schedule: data, created_contact: createdContact });
}
