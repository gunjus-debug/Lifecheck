import { supabaseAdmin } from './supabaseClient';

export async function ensureUserExists(userId: string, opts?: { email?: string | null; full_name?: string | null; createMinimal?: boolean }) {
  if (!userId) return false;
  const { data: existing } = await supabaseAdmin.from('users').select('id').eq('id', userId).single();
  if (existing) return true;

  const { email, full_name, createMinimal } = opts ?? {};
  if (!email && !full_name && !createMinimal) return false;

  const payload: any = { id: userId };
  payload.email = email ?? null;
  payload.full_name = full_name ?? email ?? 'User';

  const { error } = await supabaseAdmin.from('users').insert(payload);
  if (error) {
    console.error('ensureUserExists insert error', error.message);
    return false;
  }
  return true;
}

export async function syncAllAuthUsers() {
  // List users via Supabase Admin API and upsert into `users` table
  // Note: admin.listUsers may paginate; for simplicity we fetch the first page.
  try {
    // @ts-ignore
    const res = await supabaseAdmin.auth.admin.listUsers();
    const users = res?.data?.users ?? res?.users ?? [];
    if (!Array.isArray(users)) return { imported: 0 };

    const rows = users.map((u: any) => ({ id: u.id, email: u.email ?? null, full_name: u.user_metadata?.full_name ?? u.email ?? 'User' }));
    if (rows.length === 0) return { imported: 0 };

    const { error } = await supabaseAdmin.from('users').upsert(rows);
    if (error) throw error;
    return { imported: rows.length };
  } catch (err) {
    console.error('syncAllAuthUsers error', err);
    throw err;
  }
}
