/**
 * AI Consultant endpoint handler.
 * Server-side only. No secrets exposed to client.
 */
import { callLLM } from './llm-provider.mjs';
import { buildKnowledgeContext } from './consult-knowledge.mjs';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_LENGTH = 20;
const MAX_HISTORY_ITEM_LENGTH = 2000;

function validateConsultBody(body) {
  if (!body || typeof body !== 'object') return null;

  const intent = body.intent === 'handoff' ? 'handoff' : 'chat';

  const message = String(body.message || '').trim();
  if (message.length > MAX_MESSAGE_LENGTH || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(message)) return null;
  if (intent === 'chat' && !message) return null;

  const history = Array.isArray(body.history) ? body.history : [];
  if (history.length > MAX_HISTORY_LENGTH) return null;

  const cleanHistory = [];
  for (const item of history) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role === 'assistant' ? 'assistant' : 'user';
    const content = String(item.content || '').trim();
    if (!content || content.length > MAX_HISTORY_ITEM_LENGTH || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(content)) continue;
    cleanHistory.push({ role, content });
  }

  const sessionContext = validateSessionContext(body.sessionContext);

  return { intent, message, history: cleanHistory, sessionContext };
}

function validateSessionContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  const out = {};
  for (const key of ['pages_viewed', 'projects_viewed', 'services_viewed']) {
    const arr = Array.isArray(ctx[key]) ? ctx[key] : [];
    out[key] = arr.slice(-20).map(String).filter(Boolean);
  }
  for (const key of ['landing_page', 'referrer']) {
    out[key] = String(ctx[key] || '').slice(0, 500);
  }
  out.utm = {};
  if (ctx.utm && typeof ctx.utm === 'object') {
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const v = String(ctx.utm[k] || '').trim();
      if (v && v.length <= 200) out.utm[k] = v;
    }
  }
  return out;
}

function respond(status, body, origin, allowed) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return Response.json(body, { status, headers });
}

export async function handleConsultRequest(request, env, fetcher = fetch) {
  const origin = request.headers.get('origin');
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

  if (request.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    if (origin && allowed.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== 'POST') {
    return respond(405, { ok: false, code: 'method' }, origin, allowed);
  }

  if (!origin || !allowed.includes(origin)) {
    return respond(403, { ok: false, code: 'origin' }, origin, allowed);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return respond(400, { ok: false, code: 'validation' }, origin, allowed);
  }

  const clean = validateConsultBody(body);
  if (!clean) {
    return respond(400, { ok: false, code: 'validation' }, origin, allowed);
  }

  if (clean.intent === 'handoff' && clean.history.length < 2) {
    return respond(400, { ok: false, code: 'validation' }, origin, allowed);
  }

  const system = buildKnowledgeContext(clean.sessionContext);

  const messages = [];
  for (const item of clean.history) {
    messages.push({ role: item.role, content: item.content });
  }
  if (clean.message) {
    messages.push({ role: 'user', content: clean.message });
  }

  // Handoff intent
  if (clean.intent === 'handoff') {
    const handoffSystem = system +
      '\n\nТвоя задача: проанализировать историю диалога и вернуть ТОЛЬКО JSON-объект без markdown и без пояснений. Поля:\n' +
      '- task: краткая формулировка задачи клиента (или пустая строка)\n' +
      '- desired_outcome: желаемый результат (или пустая строка)\n' +
      '- urgency: срочность, если упоминалась (или пустая строка)\n' +
      '- interest_area: область интереса (или пустая строка)\n' +
      '- recommended_service: рекомендуемая услуга из списка (или пустая строка)\n' +
      '- relevant_projects: массив релевантных проектов (или пустой массив)\n' +
      '- conversation_summary: краткое резюме диалога (2–3 предложения)\n\n' +
      'Никогда не придумывай отсутствующие данные. Используй только то, что есть в истории.';

    const result = await callLLM({ system: handoffSystem, messages, env }, fetcher);
    if (!result) {
      return respond(503, { ok: false, code: 'unavailable', fallback: true }, origin, allowed);
    }

    let handoff = {};
    try {
      const text = result.reply;
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      handoff = JSON.parse(jsonStr);
    } catch {
      handoff = {};
    }

    const sanitized = {
      task: String(handoff.task || '').slice(0, 500),
      desired_outcome: String(handoff.desired_outcome || '').slice(0, 500),
      urgency: String(handoff.urgency || '').slice(0, 100),
      interest_area: String(handoff.interest_area || '').slice(0, 200),
      recommended_service: String(handoff.recommended_service || '').slice(0, 200),
      relevant_projects: Array.isArray(handoff.relevant_projects) ? handoff.relevant_projects.slice(0, 5).map(String) : [],
      conversation_summary: String(handoff.conversation_summary || '').slice(0, 1000),
    };

    return respond(200, { ok: true, handoff: sanitized }, origin, allowed);
  }

  // Chat intent
  const result = await callLLM({ system, messages, env }, fetcher);
  if (!result) {
    return respond(503, { ok: false, code: 'unavailable', fallback: true }, origin, allowed);
  }

  const reply = result.reply
    .replace(/[<>]/g, '')
    .slice(0, 2000);

  return respond(200, { ok: true, reply }, origin, allowed);
}
