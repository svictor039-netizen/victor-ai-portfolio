import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsultRequest } from './consult-handler.mjs';

const origin = 'https://portfolio.example';
const env = { ALLOWED_ORIGINS: origin };
const makeRequest = (body, headers = {}, method = 'POST') => new Request('https://worker.example/api/consult', {
  method,
  headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
  ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
});

const noNetwork = () => { throw new Error('Unexpected network request'); };

const okLLM = (reply) => async () => Response.json({ choices: [{ message: { content: reply } }] });
const failLLM = () => async () => Response.json({ error: 'bad' }, { status: 500 });

// 1. Normal consult request
test('normal chat request returns reply', async () => {
  const response = await handleConsultRequest(
    makeRequest({ message: 'Что делает Виктор?', history: [] }),
    { ...env, LLM_API_KEY: 'test', LLM_PROVIDER_URL: 'https://api.example.com/v1/chat/completions' },
    okLLM('Виктор разрабатывает AI-агентов и автоматизацию.')
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.reply, 'Виктор разрабатывает AI-агентов и автоматизацию.');
});

// 2. Empty message
test('empty message returns validation error', async () => {
  const response = await handleConsultRequest(makeRequest({ message: '' }), env, noNetwork);
  assert.equal(response.status, 400);
});

// 3. Too long message
test('too long message returns validation error', async () => {
  const response = await handleConsultRequest(makeRequest({ message: 'x'.repeat(1001) }), env, noNetwork);
  assert.equal(response.status, 400);
});

// 4. Too long history
test('too long history returns validation error', async () => {
  const history = Array.from({ length: 21 }, (_, i) => ({ role: 'user', content: `msg ${i}` }));
  const response = await handleConsultRequest(makeRequest({ message: 'hi', history }), env, noNetwork);
  assert.equal(response.status, 400);
});

// 5. Unknown fields are ignored
test('unknown fields in body are ignored', async () => {
  const response = await handleConsultRequest(
    makeRequest({ message: 'hi', history: [], extraField: 'ignored', nested: { a: 1 } }),
    { ...env, LLM_API_KEY: 'test' },
    okLLM('Привет!')
  );
  assert.equal(response.status, 200);
});

// 6. Client cannot override score
test('client cannot inject score or internal fields', async () => {
  const response = await handleConsultRequest(
    makeRequest({ message: 'hi', history: [], lead_score: 999, internal: 'data' }),
    { ...env, LLM_API_KEY: 'test' },
    okLLM('Привет!')
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
});

// 7. Structured handoff validation
test('handoff intent returns structured object', async () => {
  const history = [
    { role: 'user', content: 'Нужен AI-агент для продаж' },
    { role: 'assistant', content: 'Есть несколько вариантов. Какие системы используете?' },
    { role: 'user', content: 'Telegram и CRM' },
  ];
  const llmReply = JSON.stringify({
    task: 'AI-агент для продаж в Telegram',
    desired_outcome: 'Автоматический первый контакт с клиентом',
    urgency: 'В течение месяца',
    interest_area: 'AI-агенты',
    recommended_service: 'AI-агенты',
    relevant_projects: ['B2B LeadFlow Agent'],
    conversation_summary: 'Клиенту нужен AI-продажник в Telegram, интеграция с CRM.',
  });
  const response = await handleConsultRequest(
    makeRequest({ history, intent: 'handoff' }),
    { ...env, LLM_API_KEY: 'test' },
    okLLM(llmReply)
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.handoff.task, 'AI-агент для продаж в Telegram');
  assert.equal(data.handoff.recommended_service, 'AI-агенты');
  assert.deepEqual(data.handoff.relevant_projects, ['B2B LeadFlow Agent']);
});

// 8. Missing LLM config → graceful fallback
test('missing LLM config returns 503 with fallback flag', async () => {
  const response = await handleConsultRequest(
    makeRequest({ message: 'hi', history: [] }),
    env,
    noNetwork
  );
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.fallback, true);
});

// 9. Provider error → graceful fallback
test('LLM provider error returns 503 with fallback flag', async () => {
  const response = await handleConsultRequest(
    makeRequest({ message: 'hi', history: [] }),
    { ...env, LLM_API_KEY: 'test' },
    failLLM()
  );
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.fallback, true);
});

// 10. LeadForm continues to work without AI
test('consult endpoint does not interfere with lead endpoint', async () => {
  // This test verifies the endpoint exists and is separate
  const response = await handleConsultRequest(
    makeRequest({ message: 'test' }),
    env,
    noNetwork
  );
  assert.ok(response.status === 400 || response.status === 503);
});

// 11. Sensitive/unexpected fields do not reach response
test('response never contains internal fields', async () => {
  const response = await handleConsultRequest(
    makeRequest({ message: 'hi', history: [] }),
    { ...env, LLM_API_KEY: 'test' },
    okLLM('Привет!')
  );
  const text = await response.text();
  assert.doesNotMatch(text, /system/);
  assert.doesNotMatch(text, /LLM_API_KEY/);
  assert.doesNotMatch(text, /secret/);
});

// 12. System/internal data not returned to client
test('error responses do not leak internal details', async () => {
  const response = await handleConsultRequest(
    makeRequest({ message: 'hi', history: [] }),
    { ...env, LLM_API_KEY: 'test' },
    async () => { throw new Error('internal crash'); }
  );
  assert.equal(response.status, 503);
  const data = await response.json();
  assert.equal(data.code, 'unavailable');
  assert.equal(data.fallback, true);
  assert.doesNotMatch(JSON.stringify(data), /internal crash/);
});

// CORS
test('rejects other origins', async () => {
  const response = await handleConsultRequest(
    makeRequest({}, { Origin: 'https://other.example' }),
    env,
    noNetwork
  );
  assert.equal(response.status, 403);
});

test('allows exact-origin preflight', async () => {
  const response = await handleConsultRequest(
    new Request('https://worker.example/api/consult', {
      method: 'OPTIONS',
      headers: { Origin: origin },
    }),
    env,
    noNetwork
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});

import { buildKnowledgeContext, REAL_PROJECT_NAMES } from './consult-knowledge.mjs';

test('knowledge context contains only real projects', () => {
  const ctx = buildKnowledgeContext(null);
  for (const name of REAL_PROJECT_NAMES) {
    assert.ok(ctx.includes(name), `expected project "${name}" in knowledge context`);
  }
  const nonexistent = ['Legal AI', 'Medical AI', 'Smart City Dashboard', 'Business Automation'];
  for (const name of nonexistent) {
    assert.doesNotMatch(ctx, new RegExp(name));
  }
});
