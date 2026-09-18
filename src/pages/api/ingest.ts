import type { APIRoute } from 'astro';
import { db, now } from '../../lib/db';


const MAX_BYTES = 32_768;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('authorization') || '';
  const token = (typeof process !== 'undefined' && process.env?.INGEST_TOKEN) ? process.env.INGEST_TOKEN : '';
  if (!token) {
    return respond(503, { ok: false, code: 'not_configured' });
  }
  if (auth !== `Bearer ${token}`) {
    return respond(401, { ok: false, code: 'unauthorized' });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.length > MAX_BYTES) return respond(413, { ok: false, code: 'too_large' });
    body = JSON.parse(text);
  } catch {
    return respond(400, { ok: false, code: 'invalid_json' });
  }

  const leadId = String(body.lead_id || '');
  if (!UUID.test(leadId)) {
    return respond(400, { ok: false, code: 'invalid_id' });
  }

  // Dedup
  const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(leadId) as { id: string } | undefined;
  if (existing) {
    return respond(200, { ok: true, id: leadId, duplicate: true });
  }

  // Validate and clamp score
  let score = Number(body.lead_score) || 0;
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  const statusChoices = ['new', 'incomplete', 'qualified', 'high_intent', 'not_ready', 'needs_review'];
  const qStatus = String(body.qualification_status || 'new');
  const qualificationStatus = statusChoices.includes(qStatus) ? qStatus : 'new';

  const utm = (body.utm || {}) as Record<string, string>;
  const ts = now();

  db.prepare(`
    INSERT INTO leads (
      id, kind, name, contact, task, process, resources, result, deadline,
      source, landing_page, referrer,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      pages_viewed, projects_viewed, services_viewed, cta_history, ai_handoff,
      qualification_status, lead_score, recommended_service, next_best_action,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    leadId,
    String(body.kind || 'request').slice(0, 20),
    String(body.name || '').slice(0, 100),
    String(body.contact || '').slice(0, 200),
    String(body.task || '').slice(0, 3000),
    String(body.process || '').slice(0, 3000),
    String(body.resources || '').slice(0, 2000),
    String(body.result || '').slice(0, 2000),
    String(body.deadline || '').slice(0, 100),
    String(body.source || 'website').slice(0, 50),
    String(body.landing_page || '').slice(0, 500),
    String(body.referrer || '').slice(0, 500),
    (utm.utm_source || '').slice(0, 200),
    (utm.utm_medium || '').slice(0, 200),
    (utm.utm_campaign || '').slice(0, 200),
    (utm.utm_content || '').slice(0, 200),
    (utm.utm_term || '').slice(0, 200),
    JSON.stringify(body.pages_viewed || []),
    JSON.stringify(body.projects_viewed || []),
    JSON.stringify(body.services_viewed || []),
    JSON.stringify(body.cta_history || []),
    JSON.stringify(body.ai_handoff || null),
    qualificationStatus,
    score,
    String(body.recommended_service || '').slice(0, 200),
    String(body.next_best_action || '').slice(0, 200),
    ts,
    ts
  );

  // Audit log
  db.prepare('INSERT INTO audit_events (actor, action, object_type, object_id, created_at) VALUES (?, ?, ?, ?, ?)')
    .run('ingestion', 'create', 'lead', leadId, ts);

  return respond(200, { ok: true, id: leadId });
};
