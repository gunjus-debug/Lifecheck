import type { NextApiRequest, NextApiResponse } from 'next';
import { syncAllAuthUsers } from '../../../lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const result = await syncAllAuthUsers();
    return res.status(200).json({ imported: result.imported ?? 0 });
  } catch (err) {
    console.error('sync-users error', err);
    return res.status(500).json({ error: 'Sync failed' });
  }
}
