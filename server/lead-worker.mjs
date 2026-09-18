// Separate Cloudflare Worker. Never copy this file or server secrets into public/dist.
import { buildLeadProfile, qualify, formatQualificationSummary } from './lead-profile.mjs';
import { handleConsultRequest } from './consult-handler.mjs';

const RECIPIENT = 'vslpk@inbox.ru';
const MAX_BYTES = 32_768;
const LIMITS = { name: 100, contact: 200, task: 3000, process: 3000, resources: 2000, result: 2000, deadline: 100, website: 200 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeUrl(val) {
  if (!val) return '';
  try {
    const u = new URL(val);
    return u.origin + u.pathname;
  } catch {
    if (String(val).startsWith('/')) return String(val);
    return '';
  }
}

async function readLimited(request) {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new Error('large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function validateLeadContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  const out = {};

  // session_id: UUID or safe token, max 64 chars, no control chars
  const sid = String(ctx.session_id || '').trim();
  if (!sid || sid.length > 64 || /[\x00-\x1f\x7f]/.test(sid)) return null;
  out.session_id = sid;

  // landing_page and referrer
  for (const key of ['landing_page', 'referrer']) {
    const val = sanitizeUrl(ctx[key]);
    if (val.length > 500 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(val)) return null;
    out[key] = val;
  }

  // UTM params
  out.utm = {};
  if (ctx.utm && typeof ctx.utm === 'object') {
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const val = String(ctx.utm[key] || '').trim();
      if (val.length > 200 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(val)) return null;
      if (val) out.utm[key] = val;
    }
  }

  // Arrays with hard limits
  const ARRAY_LIMITS = { pages_viewed: 50, projects_viewed: 20, services_viewed: 20, cta_history: 20 };
  for (const [key, max] of Object.entries(ARRAY_LIMITS)) {
    const arr = Array.isArray(ctx[key]) ? ctx[key] : [];
    out[key] = arr.slice(-max).map(item => {
      if (key === 'cta_history' && item && typeof item === 'object') {
        return {
          name: String(item.name || '').slice(0, 50),
          page: sanitizeUrl(item.page).slice(0, 500),
          timestamp: Number(item.timestamp) || 0,
        };
      }
      return sanitizeUrl(item).slice(0, 500);
    }).filter(Boolean);
  }

  return out;
}

function validate(body) {
  if (!body || typeof body !== 'object' || !['request', 'brief'].includes(body.kind) ||
      body.consent !== true || body.consentVersion !== '2026-09-09' ||
      !UUID.test(body.requestId) || typeof body.turnstileToken !== 'string' ||
      !body.turnstileToken || body.turnstileToken.length > 2048) return null;
  const clean = { kind: body.kind, requestId: body.requestId };
  for (const [key, max] of Object.entries(LIMITS)) {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) return null;
    clean[key] = value.trim();
  }
  const required = body.kind === 'brief' ? ['task', 'process', 'resources', 'result', 'contact'] : ['name', 'contact', 'task'];
  if (required.some(key => !clean[key]) || clean.website) return null;

  // Optional lead context
  if (body.leadContext) {
    clean.leadContext = validateLeadContext(body.leadContext);
    if (!clean.leadContext) return null;
  }

  // Optional AI Consultant handoff (structured summary from chat)
  if (body.aiHandoff && typeof body.aiHandoff === 'object') {
    clean.aiHandoff = validateAiHandoff(body.aiHandoff);
    if (!clean.aiHandoff) return null;
  }

  return clean;
}

function validateAiHandoff(h) {
  if (!h || typeof h !== 'object') return null;
  const out = {};
  for (const [key, max] of Object.entries({ task: 500, desired_outcome: 500, urgency: 100, interest_area: 200, recommended_service: 200, conversation_summary: 1000 })) {
    const value = h[key];
    if (value !== undefined && (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))) return null;
    if (value) out[key] = value.trim();
  }
  const projects = Array.isArray(h.relevant_projects) ? h.relevant_projects : [];
  out.relevant_projects = projects.slice(0, 5).map(String).filter(Boolean);
  return out;
}

async function ingestToBackOffice(clean, env, fetcher = fetch) {
  const url = env.BACKOFFICE_INGEST_URL;
  const token = env.INGEST_TOKEN;
  if (!url || !token) return;
  try {
    await fetcher(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        lead_id: clean.requestId,
        name: clean.name || clean.contact,
        contact: clean.contact,
        task: clean.task,
        kind: clean.kind,
        landing_page: clean.leadContext?.landing_page || '',
        source: clean.leadContext?.utm?.utm_source || 'worker',
        score: 0,
        qualification_status: 'new',
        next_action: 'review',
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Non-blocking fallback: ingestion failure must not break email delivery
  }
}

export async function handleRequest(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  if (url.pathname === '/api/consult') {
    return handleConsultRequest(request, env, fetcher);
  }
  const origin = request.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
  const respond = (status, code) => Response.json(status === 200 ? { ok: true } : { ok: false, code }, { status, headers });
  if (url.pathname !== '/api/leads') return respond(404, 'not_found');
  if (!origin || !allowed.includes(origin)) return respond(403, 'origin');
  headers['Access-Control-Allow-Origin'] = origin;
  if (request.method === 'OPTIONS') {
    headers['Access-Control-Allow-Methods'] = 'POST';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'POST') return respond(405, 'method');
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !env.TURNSTILE_SECRET_KEY || env.LEAD_CONSENT_CONFIRMED !== 'true') return respond(503, 'unavailable');
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return respond(415, 'content_type');

  let body;
  try { body = await readLimited(request); }
  catch (error) { return respond(error.message === 'large' ? 413 : 400, 'validation'); }
  const clean = validate(body);
  if (!clean) return respond(400, 'validation');

  try {
    const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: body.turnstileToken }),
      signal: AbortSignal.timeout(8000),
    });
    if (!verification.ok) return respond(502, 'challenge');
    const result = await verification.json();
    if (result.success !== true || result.action !== 'lead' || result.hostname !== new URL(origin).hostname) return respond(400, 'challenge');

    const labels = { name: 'Имя', contact: 'Контакт', task: 'Задача', process: 'Текущий процесс', resources: 'Данные и сервисы', result: 'Критерий успеха', deadline: 'Срок' };
    let text = Object.entries(labels).filter(([key]) => clean[key]).map(([key, label]) => label + ':\n' + clean[key]).join('\n\n') +
      '\n\nСогласие: да; версия 2026-09-09.\nИсточник: ' + origin;

    if (clean.leadContext) {
      const c = clean.leadContext;
      text += '\n\n--- Контекст сессии ---';
      text += '\nSession ID: ' + c.session_id;
      text += '\nLanding: ' + c.landing_page;
      text += '\nReferrer: ' + c.referrer;
      if (Object.keys(c.utm).length) {
        text += '\nUTM: ' + Object.entries(c.utm).map(([k, v]) => `${k}=${v}`).join(', ');
      }
      if (c.pages_viewed?.length) text += '\nСтраницы: ' + c.pages_viewed.join(', ');
      if (c.projects_viewed?.length) text += '\nПроекты: ' + c.projects_viewed.join(', ');
      if (c.services_viewed?.length) text += '\nУслуги: ' + c.services_viewed.join(', ');
      if (c.cta_history?.length) {
        text += '\nCTA (' + c.cta_history.length + '): ' + c.cta_history.slice(-5).map(h => h.name + ' на ' + h.page).join('; ');
      }
    }

    // Qualification (server-side only)
    let qualificationText = '';
    try {
      const profile = buildLeadProfile(clean, clean.leadContext || {});
      qualify(profile);
      qualificationText = formatQualificationSummary(profile);
    } catch {
      // Qualification must not break form submission
    }
    if (qualificationText) {
      text += '\n\n' + qualificationText;
    }

    // aiHandoff is untrusted client input — it was stored in sessionStorage and could be modified.
    // We validate field names and lengths, but never use it as a source for lead_score or confirmed facts.
    if (clean.aiHandoff) {
      text += '\n\n--- AI summary / unverified until confirmed by user ---';
      if (clean.aiHandoff.task) text += '\nЗадача: ' + clean.aiHandoff.task;
      if (clean.aiHandoff.desired_outcome) text += '\nОжидаемый результат: ' + clean.aiHandoff.desired_outcome;
      if (clean.aiHandoff.urgency) text += '\nСрочность: ' + clean.aiHandoff.urgency;
      if (clean.aiHandoff.interest_area) text += '\nОбласть интереса: ' + clean.aiHandoff.interest_area;
      if (clean.aiHandoff.recommended_service) text += '\nРекомендуемая услуга: ' + clean.aiHandoff.recommended_service;
      if (clean.aiHandoff.relevant_projects?.length) text += '\nРелевантные проекты: ' + clean.aiHandoff.relevant_projects.join(', ');
      if (clean.aiHandoff.conversation_summary) text += '\nРезюме диалога: ' + clean.aiHandoff.conversation_summary;
    }

    const email = {
      from: env.MAIL_FROM,
      to: [RECIPIENT],
      subject: clean.kind === 'brief' ? 'Бриф с сайта Виктора' : 'Заявка на оценку проекта',
      text,
    };
    // Stable across retries; no user-controlled email headers or recipients.
    const response = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'lead/' + body.requestId },
      body: JSON.stringify(email),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return respond(502, 'delivery');
    const sent = await response.json();
    if (typeof sent.id !== 'string' || !sent.id) return respond(502, 'delivery');

    // Non-blocking: ingest to back office after successful email delivery
    await ingestToBackOffice(clean, env, fetcher);

    return respond(200);
  } catch { return respond(502, 'delivery'); }
}
export default { fetch(request, env) { return handleRequest(request, env); } };
