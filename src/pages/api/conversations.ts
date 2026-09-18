import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { getSessionToken, validateSession } from '../../lib/auth';


export const GET: APIRoute = async ({ request }) => {
  const token = getSessionToken(request);
  const session = token ? validateSession(token) : null;
  if (!session) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const rows = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC').all() as Record<string, unknown>[];

  const conversations = rows.map((r) => ({
    ...r,
    messages: safeJson(r.messages),
    handoff: safeJson(r.handoff),
  }));

  return new Response(JSON.stringify({ ok: true, conversations }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

function safeJson(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
}
