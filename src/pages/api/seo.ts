import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { getSessionToken, validateSession } from '../../lib/auth';


export const GET: APIRoute = async ({ request }) => {
  const token = getSessionToken(request);
  const session = token ? validateSession(token) : null;
  if (!session) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const pages = db.prepare('SELECT * FROM page_seo_state ORDER BY url').all() as Record<string, unknown>[];
  return new Response(JSON.stringify({ ok: true, pages }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
