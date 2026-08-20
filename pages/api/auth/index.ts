import type { NextApiRequest, NextApiResponse } from 'next';

function buildCookie(name: string, value: string, options: { path?: string; httpOnly?: boolean; sameSite?: 'Lax' | 'Strict' | 'None'; secure?: boolean; maxAge?: number; expires?: Date | null } = {}) {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push('Secure');
  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  return parts.join('; ');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Expect client to POST { event, session }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { event, session } = req.body ?? {};

    const secure = process.env.NODE_ENV === 'production';

    // Helper to clear cookies
    const clearCookies = () => {
      const cookies = [
        buildCookie('sb-access-token', '', { path: '/', httpOnly: true, sameSite: 'Lax', secure, maxAge: 0 }),
        buildCookie('sb-refresh-token', '', { path: '/', httpOnly: true, sameSite: 'Lax', secure, maxAge: 0 }),
      ];
      res.setHeader('Set-Cookie', cookies);
    };

    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      clearCookies();
      return res.status(200).json({ message: 'Signed out' });
    }

    if (!session || !session.access_token) {
      // Nothing to set
      return res.status(400).json({ error: 'Missing session or access_token' });
    }

    const accessToken = session.access_token as string;
    const refreshToken = session.refresh_token as string | undefined;

    // Compute maxAge from expiry if provided (session.expires_at is epoch seconds)
    let maxAge: number | undefined = undefined;
    if (session.expires_at && typeof session.expires_at === 'number') {
      const expiresAtMs = session.expires_at * 1000;
      const now = Date.now();
      maxAge = Math.max(0, (expiresAtMs - now) / 1000);
    }

    const cookies: string[] = [];
    cookies.push(buildCookie('sb-access-token', accessToken, { path: '/', httpOnly: true, sameSite: 'Lax', secure, maxAge }));
    if (refreshToken) cookies.push(buildCookie('sb-refresh-token', refreshToken, { path: '/', httpOnly: true, sameSite: 'Lax', secure }));

    res.setHeader('Set-Cookie', cookies);
    return res.status(200).json({ message: 'Cookies set' });
  } catch (err) {
    console.error('auth handler error', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}
