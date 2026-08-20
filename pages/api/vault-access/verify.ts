import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabaseClient';

const VAULT_ACCESS_TOKENS_TABLE = 'vault_access_tokens';
const VAULT_ITEMS_TABLE = 'vault_items';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, otpCode } = req.body as { token?: string; otpCode?: string };

  if (!token || !otpCode) {
    return res.status(400).json({ error: 'Token and OTP code are required' });
  }

  const now = new Date().toISOString();
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from(VAULT_ACCESS_TOKENS_TABLE)
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .lte('expires_at', now)
    .single();

  if (tokenError || !tokenRow) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  if (tokenRow.otp_code !== otpCode) {
    return res.status(400).json({ error: 'Incorrect OTP' });
  }

  const { data: vaultItems, error: vaultError } = await supabaseAdmin
    .from(VAULT_ITEMS_TABLE)
    .select('id, label, encrypted_payload, encryption_metadata, category')
    .eq('user_id', tokenRow.user_id)
    .eq('active', true);

  if (vaultError) {
    return res.status(500).json({ error: 'Unable to load vault items' });
  }

  await supabaseAdmin
    .from(VAULT_ACCESS_TOKENS_TABLE)
    .update({ used: true })
    .eq('id', tokenRow.id);

  return res.status(200).json({
    message: 'Vault access verified',
    vaultItems,
  });
}
