import type { APIRoute } from 'astro';
import { db } from '../../lib/db';
import { getSessionToken, validateSession } from '../../lib/auth';


function safeJson(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
}

function enrich(row: Record<string, unknown>) {
  return {
    ...row,
    utm: { utm_source: row.utm_source, utm_medium: row.utm_medium, utm_campaign: row.utm_campaign, utm_content: row.utm_content, utm_term: row.utm_term },
    pages_viewed: safeJson(row.pages_viewed),
    projects_viewed: safeJson(row.projects_viewed),
    services_viewed: safeJson(row.services_viewed),
    cta_history: safeJson(row.cta_history),
    ai_handoff: safeJson(row.ai_handoff),
  };
}

export const GET: APIRoute = async ({ request }) => {
  const token = getSessionToken(request);
  const session = token ? validateSession(token) : null;
  if (!session) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const status = url.searchParams.get('status') || '';
  const sort = url.searchParams.get('sort') || 'created_at';
  const order = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

  if (id) {
    const stmt = db.prepare('SELECT * FROM leads WHERE id = ?');
    const rows = stmt.all(id) as Record<string, unknown>[];
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: false, code: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true, lead: enrich(rows[0]) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params: (string | number)[] = [];

  if (q) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(company) LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (status) {
    sql += ' AND qualification_status = ?';
    params.push(status);
  }

  const safeSort = ['created_at', 'score', 'name'].includes(sort) ? sort : 'created_at';
  sql += ` ORDER BY ${safeSort} ${order}`;

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  const leads = rows.map(enrich);

  return new Response(JSON.stringify({ ok: true, leads }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request }) => {
  const token = getSessionToken(request);
  const session = token ? validateSession(token) : null;
  if (!session) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ ok: false, code: 'missing_id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    db.prepare('DELETE FROM leads WHERE id = ?').run(id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ ok: false, code: 'db_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
