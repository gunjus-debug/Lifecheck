import { createServerClient } from '@supabase/auth-helpers-nextjs';
import type { GetServerSidePropsContext } from 'next';

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return [];
  }
  return cookieHeader.split('; ').map((pair) => {
    const index = pair.indexOf('=');
    return {
      name: pair.slice(0, index),
      value: pair.slice(index + 1),
    };
  });
}

export function createServerSupabase(ctx: GetServerSidePropsContext) {
  const cookies = {
    getAll: () => parseCookies(ctx.req.headers.cookie),
    setAll: (cookieList: { name: string; value: string; options: Record<string, unknown> }[]) => {
      const headerValues = cookieList.map((cookie) => {
        const attributes = ['Path=/', 'HttpOnly', 'SameSite=Lax'];
        const value = `${cookie.name}=${cookie.value}; ${attributes.join('; ')}`;
        return value;
      });
      ctx.res.setHeader('Set-Cookie', headerValues);
    },
  };

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    {
      cookies,
    }
  );
}
