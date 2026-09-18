import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from './lead-worker.mjs';

const origin = 'https://portfolio.example';
const env = { ALLOWED_ORIGINS: origin, RESEND_API_KEY: 'test-secret', MAIL_FROM: 'test@example.com', TURNSTILE_SECRET_KEY: 'test-secret', LEAD_CONSENT_CONFIRMED: 'true' };
const payload = { kind: 'request', name: 'Тест', contact: '@test', task: 'Проверка формы', consent: true, consentVersion: '2026-09-09', requestId: '12345678-1234-4234-8234-123456789abc', turnstileToken: 'test-token' };
const makeRequest = (body = payload, headers = {}, method = 'POST') => new Request('https://worker.example/api/leads', { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
const noNetwork = () => { throw new Error('Unexpected network request'); };
const challenge = () => Response.json({ success: true, action: 'lead', hostname: 'portfolio.example' });

test('missing configuration and unconfirmed consent fail closed', async () => {
  for (const missing of ['RESEND_API_KEY', 'MAIL_FROM', 'TURNSTILE_SECRET_KEY', 'LEAD_CONSENT_CONFIRMED']) {
    const response = await handleRequest(makeRequest(), { ...env, [missing]: '' }, noNetwork);
    assert.equal(response.status, 503);
  }
});
test('rejects other origins and methods; allows exact-origin CORS preflight', async () => {
  assert.equal((await handleRequest(makeRequest(payload, { Origin: 'https://other.example' }), env, noNetwork)).status, 403);
  assert.equal((await handleRequest(makeRequest(payload, {}, 'GET'), env, noNetwork)).status, 405);
  const response = await handleRequest(makeRequest(payload, {}, 'OPTIONS'), env, noNetwork);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});
test('validates consent, fields, size, honeypot and request identifiers before network', async () => {
  for (const patch of [{ consent: false }, { consentVersion: 'old' }, { name: '  ' }, { contact: '' }, { task: 3 }, { task: 'x'.repeat(3001) }, { website: 'spam' }, { requestId: 'bad' }, { turnstileToken: '' }, { kind: 'brief' }]) {
    assert.equal((await handleRequest(makeRequest({ ...payload, ...patch }), env, noNetwork)).status, 400);
  }
  assert.equal((await handleRequest(makeRequest({ ...payload, task: 'x'.repeat(33000) }), env, noNetwork)).status, 413);
  assert.equal((await handleRequest(makeRequest(payload, { 'Content-Type': 'text/plain' }), env, noNetwork)).status, 415);
});
test('requires successful Turnstile hostname and action validation', async () => {
  for (const verification of [{ success: false }, { success: true, action: 'wrong', hostname: 'portfolio.example' }, { success: true, action: 'lead', hostname: 'other.example' }]) {
    let calls = 0;
    const response = await handleRequest(makeRequest(), env, async () => { calls++; return Response.json(verification); });
    assert.equal(response.status, 400);
    assert.equal(calls, 1);
  }
});
test('both form types send only to fixed recipient with a stable idempotency key', async () => {
  for (const body of [payload, { ...payload, kind: 'brief', process: 'Вручную', resources: 'Таблицы', result: 'Упростить работу', deadline: '' }]) {
    const emails = [];
    const send = async (url, init) => {
      if (url.includes('siteverify')) return challenge();
      emails.push({ headers: init.headers, body: JSON.parse(init.body) });
      return Response.json({ id: 'email-id' });
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await handleRequest(makeRequest({ ...body, to: 'attacker@example.com', from: 'attacker@example.com' }), env, send);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    }
    assert.deepEqual(emails[0], emails[1]);
    assert.deepEqual(emails[0].body.to, ['vslpk@inbox.ru']);
    assert.equal(emails[0].body.from, env.MAIL_FROM);
    assert.equal(emails[0].headers['Idempotency-Key'], 'lead/' + payload.requestId);
    assert.match(emails[0].body.text, /Согласие: да/);
  }
});
test('mail rejection, invalid provider response and timeout never return success or leak secrets', async () => {
  for (const mode of ['rejected', 'invalid', 'timeout']) {
    const response = await handleRequest(makeRequest(), env, async url => {
      if (url.includes('siteverify')) return challenge();
      if (mode === 'timeout') throw new Error('test-secret');
      return mode === 'rejected' ? Response.json({ error: 'test-secret' }, { status: 429 }) : Response.json({});
    });
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { ok: false, code: 'delivery' });
  }
});

// Lead context tests
const validLeadContext = {
  session_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  landing_page: '/',
  referrer: 'https://example.com/',
  utm: { utm_source: 'test', utm_medium: 'email' },
  pages_viewed: ['/', '/projects/'],
  projects_viewed: ['kmk-ai-consultant'],
  services_viewed: ['AI-агенты'],
  cta_history: [{ name: 'telegram_click', page: '/', timestamp: 1720000000000 }],
};

test('valid lead context is accepted and included in email', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: validLeadContext }), env, send);
  assert.equal(response.status, 200);
  assert.match(emails[0].body.text, /Session ID:/);
  assert.match(emails[0].body.text, /a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/);
  assert.match(emails[0].body.text, /\/projects\//);
});

test('too long session_id in lead context is rejected safely', async () => {
  const bad = { ...validLeadContext, session_id: 'x'.repeat(65) };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: bad }), env, noNetwork);
  assert.equal(response.status, 400);
});

test('unexpected fields in lead context are not passed through', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const hacked = { ...validLeadContext, injectedField: 'malicious', foo: { bar: 'baz' } };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: hacked }), env, send);
  assert.equal(response.status, 200);
  assert.doesNotMatch(emails[0].body.text, /injectedField/);
  assert.doesNotMatch(emails[0].body.text, /malicious/);
});

test('absence of lead context does not break old form', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const response = await handleRequest(makeRequest(payload), env, send);
  assert.equal(response.status, 200);
  assert.doesNotMatch(emails[0].body.text, /Контекст сессии/);
});

test('oversized arrays in lead context are truncated safely', async () => {
  const huge = {
    ...validLeadContext,
    pages_viewed: Array.from({ length: 60 }, (_, i) => `/page-${i}`),
    cta_history: Array.from({ length: 25 }, (_, i) => ({ name: `click-${i}`, page: '/', timestamp: i })),
  };
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: huge }), env, send);
  assert.equal(response.status, 200);
  const text = emails[0].body.text;
  const pagesMatch = text.match(/page-59/);
  assert.ok(pagesMatch, 'last page should be present after truncation');
});

test('arbitrary query parameters do not leak into lead context', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const ctx = {
    ...validLeadContext,
    landing_page: 'https://example.com/page?utm_source=evil&password=secret#hash',
    pages_viewed: ['https://example.com/page?token=abc'],
    referrer: 'https://other.com/page?secret=123',
  };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: ctx }), env, send);
  assert.equal(response.status, 200);
  const text = emails[0].body.text;
  assert.doesNotMatch(text, /password=secret/);
  assert.doesNotMatch(text, /token=abc/);
  assert.doesNotMatch(text, /secret=123/);
  assert.doesNotMatch(text, /#hash/);
});

test('UTM whitelist is preserved in lead context', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const ctx = {
    ...validLeadContext,
    utm: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'launch', utm_content: 'hero', utm_term: 'ai' },
  };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: ctx }), env, send);
  assert.equal(response.status, 200);
  assert.match(emails[0].body.text, /utm_source=google/);
  assert.match(emails[0].body.text, /utm_term=ai/);
});

// Qualification engine tests
const emptyLeadContext = {
  session_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  landing_page: '/',
  referrer: '',
  utm: {},
  pages_viewed: [],
  projects_viewed: [],
  services_viewed: [],
  cta_history: [],
};

test('minimal lead without context gets needs_review status', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  // Minimal request with task only — score = 30 (form_submitted) → needs_review
  const response = await handleRequest(makeRequest({ ...payload, leadContext: emptyLeadContext }), env, send);
  assert.equal(response.status, 200);
  assert.match(emails[0].body.text, /Квалификация лида/);
  assert.match(emails[0].body.text, /Статус: needs_review/);
});

test('strong business lead gets qualified/high_intent status', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const ctx = {
    ...emptyLeadContext,
    projects_viewed: ['kmk-ai-consultant', 'ai-content-factory'],
    services_viewed: ['AI-агенты'],
    cta_history: [
      { name: 'case_cta_click', page: '/projects/kmk-ai-consultant/', timestamp: 1720000000000 },
      { name: 'telegram_click', page: '/', timestamp: 1720000000001 },
    ],
  };
  const body = {
    ...payload,
    leadContext: ctx,
    task: 'Нужен AI-консультант для обработки заявок клиентов через Telegram и веб-чат. База знаний около 200 документов.',
    deadline: '2 месяца',
  };
  const response = await handleRequest(makeRequest(body), env, send);
  assert.equal(response.status, 200);
  assert.match(emails[0].body.text, /Статус: (qualified|high_intent)/);
  assert.match(emails[0].body.text, /Рекомендуемый сервис:/);
});

test('client cannot override lead score via payload', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const hacked = {
    ...payload,
    leadContext: { ...emptyLeadContext, lead_score: 9999, qualification_status: 'high_intent', score_reasons: ['hacked'] },
  };
  const response = await handleRequest(makeRequest(hacked), env, send);
  assert.equal(response.status, 200);
  const text = emails[0].body.text;
  // Engine recalculates server-side; client values ignored
  assert.doesNotMatch(text, /lead_score: 9999/);
  assert.doesNotMatch(text, /hacked/);
});

test('unknown fields in payload do not affect qualification', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const body = {
    ...payload,
    leadContext: emptyLeadContext,
    foo: 'bar',
    injectedScore: 100,
  };
  const response = await handleRequest(makeRequest(body), env, send);
  assert.equal(response.status, 200);
  assert.doesNotMatch(emails[0].body.text, /injectedScore/);
});

test('sensitive/unexpected fields do not influence score', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const ctx = {
    ...emptyLeadContext,
    gender: 'male',
    age: '35',
    religion: 'none',
    political_views: 'liberal',
    health_status: 'good',
    nationality: 'ru',
  };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: ctx }), env, send);
  assert.equal(response.status, 200);
  const text = emails[0].body.text;
  assert.doesNotMatch(text, /gender|age|religion|political|health|nationality/);
});

test('old form without lead context still works and gets qualification', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const response = await handleRequest(makeRequest(payload), env, send);
  assert.equal(response.status, 200);
  assert.doesNotMatch(emails[0].body.text, /Контекст сессии/);
  assert.match(emails[0].body.text, /Квалификация лида/);
});

test('qualification summary is included in email text', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const ctx = {
    ...emptyLeadContext,
    projects_viewed: ['kmk-ai-consultant'],
    cta_history: [{ name: 'case_cta_click', page: '/projects/kmk-ai-consultant/', timestamp: 1720000000000 }],
  };
  const response = await handleRequest(makeRequest({ ...payload, leadContext: ctx }), env, send);
  assert.equal(response.status, 200);
  const text = emails[0].body.text;
  assert.match(text, /Score:/);
  assert.match(text, /Интерес:/);
  assert.match(text, /Следующий шаг:/);
});

// AI Consultant handoff tests
test('aiHandoff is accepted and included in email', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const aiHandoff = {
    task: 'AI-агент для продаж',
    desired_outcome: 'Автоматический первый контакт',
    urgency: 'В течение месяца',
    interest_area: 'AI-агенты',
    recommended_service: 'AI-агенты',
    relevant_projects: ['B2B LeadFlow Agent'],
    conversation_summary: 'Клиенту нужен AI-продажник в Telegram.',
  };
  const response = await handleRequest(makeRequest({ ...payload, aiHandoff }), env, send);
  assert.equal(response.status, 200);
  const text = emails[0].body.text;
  assert.match(text, /AI summary \/ unverified until confirmed by user/);
  assert.match(text, /AI-агент для продаж/);
  assert.match(text, /B2B LeadFlow Agent/);
});

test('invalid aiHandoff fields are rejected', async () => {
  const badHandoffs = [
    { task: 'x'.repeat(501) },
    { desired_outcome: 123 },
    { urgency: true },
    { conversation_summary: 'x'.repeat(1001) },
    { task: 'ok\x00bad' },
  ];
  for (const bad of badHandoffs) {
    const response = await handleRequest(makeRequest({ ...payload, aiHandoff: bad }), env, noNetwork);
    assert.equal(response.status, 400);
  }
});

test('unexpected fields in aiHandoff are ignored', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  const aiHandoff = {
    task: 'Нормальная задача',
    injectedScore: 9999,
    secret: 'data',
  };
  const response = await handleRequest(makeRequest({ ...payload, aiHandoff }), env, send);
  assert.equal(response.status, 200);
  const text = emails[0].body.text;
  assert.doesNotMatch(text, /injectedScore/);
  assert.doesNotMatch(text, /secret/);
});

test('aiHandoff does not affect lead qualification score', async () => {
  const emails = [];
  const send = async (url, init) => {
    if (url.includes('siteverify')) return challenge();
    emails.push({ body: JSON.parse(init.body) });
    return Response.json({ id: 'email-id' });
  };
  // Form with no aiHandoff
  const response1 = await handleRequest(makeRequest({ ...payload, leadContext: emptyLeadContext }), env, send);
  assert.equal(response1.status, 200);
  const text1 = emails[0].body.text;
  const score1 = text1.match(/Score: (\d+)/)?.[1];

  // Same form with aiHandoff containing a large task — should not change score
  emails.length = 0;
  const aiHandoff = {
    task: 'AI-агент для продаж в Telegram с интеграцией CRM и базой знаний 200 документов',
    desired_outcome: 'Автоматический первый контакт',
    urgency: 'В течение месяца',
    interest_area: 'AI-агенты',
    recommended_service: 'AI-агенты',
    relevant_projects: ['b2b-leadflow'],
    conversation_summary: 'Клиенту нужен AI-продажник.',
  };
  const response2 = await handleRequest(makeRequest({ ...payload, leadContext: emptyLeadContext, aiHandoff }), env, send);
  assert.equal(response2.status, 200);
  const text2 = emails[0].body.text;
  const score2 = text2.match(/Score: (\d+)/)?.[1];

  assert.equal(score1, score2, 'aiHandoff must not influence server-side lead_score');
  // Qualification summary must not reference aiHandoff data as a source
  const qualBlock = text2.split('--- Квалификация лида ---')[1]?.split('--- AI summary')[0] || '';
  assert.doesNotMatch(qualBlock, /b2b-leadflow/);
  assert.doesNotMatch(qualBlock, /AI-агент для продаж в Telegram/);
});
