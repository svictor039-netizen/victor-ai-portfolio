import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { getSessionToken, validateSession } from '../../lib/auth';


export const GET: APIRoute = async ({ request }) => {
  const token = getSessionToken(request);
  const session = token ? validateSession(token) : null;
  if (!session) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const integrations = db.prepare('SELECT * FROM integration_status ORDER BY name').all() as Record<string, unknown>[];
  const logs = db.prepare('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50').all() as Record<string, unknown>[];

  return new Response(JSON.stringify({ ok: true, integrations, logs }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
