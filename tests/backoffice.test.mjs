/**
 * Back Office server-side tests.
 * Run with: node --experimental-vm-modules tests/backoffice.test.mjs
 */
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { db, now } from '../src/lib/db.ts';
import { createSession, validateSession, getSessionToken, sessionCookie } from '../src/lib/auth.ts';

// Helper: simulate request/response for Astro API routes
function makeRequest({ method = 'GET', url = 'http://localhost/api/test', headers = {}, body = null } = {}) {
  const req = new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return req;
}

function getCookieValue(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

// ─── Auth tests ──────────────────────────────────────────────

function testAuth() {
  console.log('▶ Auth: createSession + validateSession');
  const token = createSession('admin');
  assert.strictEqual(typeof token, 'string');
  assert.ok(token.length > 0);

  const session = validateSession(token);
  assert.ok(session);
  assert.strictEqual(session.username, 'admin');

  console.log('▶ Auth: invalid token rejected');
  assert.strictEqual(validateSession('bad-token'), null);

  console.log('▶ Auth: expired session rejected');
  // Manually insert expired session
  const expiredToken = 'expired-' + Date.now();
  db.prepare('INSERT INTO sessions (id, username, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(expiredToken, 'admin', 0, 1);
  assert.strictEqual(validateSession(expiredToken), null);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(expiredToken);

  console.log('▶ Auth: sessionCookie format');
  const cookie = sessionCookie('abc123');
  assert.ok(cookie.includes('victor_session=abc123'));
  assert.ok(cookie.includes('HttpOnly'));
  assert.ok(cookie.includes('SameSite=Strict'));

  console.log('▶ Auth: getSessionToken from headers');
  const req = new Request('http://localhost/', { headers: { cookie: 'victor_session=xyz; other=1' } });
  assert.strictEqual(getSessionToken(req), 'xyz');

  console.log('▶ Auth: getSessionToken missing');
  assert.strictEqual(getSessionToken(new Request('http://localhost/')), undefined);
}

// ─── Ingestion tests ─────────────────────────────────────────

async function testIngest() {
  process.env.INGEST_TOKEN = 'test-ingest-token';

  console.log('▶ Ingest: unauthorized without token');
  const req1 = makeRequest({ method: 'POST', url: 'http://localhost/api/ingest', body: {} });
  const { POST: ingestPOST } = await import('../src/pages/api/ingest.ts');
  const resp1 = await ingestPOST({ request: req1 });
  assert.strictEqual(resp1.status, 401);

  console.log('▶ Ingest: invalid token rejected');
  const req2 = makeRequest({ method: 'POST', url: 'http://localhost/api/ingest', headers: { Authorization: 'Bearer bad' }, body: {} });
  const resp2 = await ingestPOST({ request: req2 });
  assert.strictEqual(resp2.status, 401);

  console.log('▶ Ingest: valid payload accepted');
  const leadIdA = randomUUID();
  const req3 = makeRequest({
    method: 'POST',
    url: 'http://localhost/api/ingest',
    headers: { Authorization: 'Bearer test-ingest-token' },
    body: {
      lead_id: leadIdA,
      name: 'Test Lead',
      contact: 'test@example.com',
      task: 'test task',
      kind: 'request',
      source: 'test',
      score: 75,
      qualification_status: 'qualified',
      next_action: 'review',
    },
  });
  const resp3 = await ingestPOST({ request: req3 });
  assert.strictEqual(resp3.status, 200);
  const json3 = await resp3.json();
  assert.strictEqual(json3.ok, true);

  console.log('▶ Ingest: dedup by lead_id');
  // Must create a fresh Request because the body is consumed on first read
  const req4 = makeRequest({
    method: 'POST',
    url: 'http://localhost/api/ingest',
    headers: { Authorization: 'Bearer test-ingest-token' },
    body: {
      lead_id: leadIdA,
      name: 'Test Lead',
      contact: 'test@example.com',
      task: 'test task',
      kind: 'request',
      source: 'test',
      score: 75,
      qualification_status: 'qualified',
      next_action: 'review',
    },
  });
  const resp4 = await ingestPOST({ request: req4 });
  assert.strictEqual(resp4.status, 200);
  const json4 = await resp4.json();
  assert.strictEqual(json4.duplicate, true);

  console.log('▶ Ingest: clamp score 0-100');
  const req5 = makeRequest({
    method: 'POST',
    url: 'http://localhost/api/ingest',
    headers: { Authorization: 'Bearer test-ingest-token' },
    body: {
      lead_id: randomUUID(),
      name: 'X',
      contact: 'x@x.com',
      task: 't',
      kind: 'request',
      source: 'test',
      score: 999,
      qualification_status: 'high_intent',
      next_action: 'review',
    },
  });
  const resp5 = await ingestPOST({ request: req5 });
  const json5 = await resp5.json();
  assert.ok([200, 201].includes(resp5.status), `Expected 200/201, got ${resp5.status}`);

  console.log('▶ Ingest: invalid lead_id rejected');
  const req6 = makeRequest({
    method: 'POST',
    url: 'http://localhost/api/ingest',
    headers: { Authorization: 'Bearer test-ingest-token' },
    body: {
      lead_id: 'not-a-valid-uuid',
      name: 'X',
      contact: 'x@x.com',
      task: 't',
      kind: 'request',
      source: 'test',
      score: 50,
      next_action: 'review',
    },
  });
  const resp6 = await ingestPOST({ request: req6 });
  assert.strictEqual(resp6.status, 400);
}

// ─── Leads API tests ────────────────────────────────────────

async function testLeadsAPI() {
  console.log('▶ Leads API: unauthorized denied');
  const { GET } = await import('../src/pages/api/leads.ts');
  const req1 = makeRequest({ url: 'http://localhost/api/leads' });
  const resp1 = await GET({ request: req1 });
  assert.strictEqual(resp1.status, 401);

  console.log('▶ Leads API: authorized returns list');
  const token = createSession('admin');
  const req2 = makeRequest({ url: 'http://localhost/api/leads', headers: { cookie: `victor_session=${token}` } });
  const resp2 = await GET({ request: req2 });
  assert.strictEqual(resp2.status, 200);
  const json2 = await resp2.json();
  assert.ok(Array.isArray(json2.leads));

  console.log('▶ Leads API: GET by id');
  // Insert a lead first
  const leadId = 'api-lead-' + Date.now();
  db.prepare(`INSERT INTO leads (id, kind, name, contact, task, source, created_at, updated_at)
    VALUES (?, 'request', 'ApiTest', 'api@test.com', 'task', 'test', ?, ?)`)
    .run(leadId, now(), now());
  const req3 = makeRequest({ url: `http://localhost/api/leads?id=${leadId}`, headers: { cookie: `victor_session=${token}` } });
  const resp3 = await GET({ request: req3 });
  assert.strictEqual(resp3.status, 200);
  const json3 = await resp3.json();
  assert.strictEqual(json3.lead.name, 'ApiTest');

  console.log('▶ Leads API: DELETE');
  const { DELETE } = await import('../src/pages/api/leads.ts');
  const req4 = makeRequest({ method: 'DELETE', url: `http://localhost/api/leads?id=${leadId}`, headers: { cookie: `victor_session=${token}` } });
  const resp4 = await DELETE({ request: req4 });
  assert.strictEqual(resp4.status, 200);

  db.prepare('DELETE FROM leads WHERE id = ?').run(leadId);
}

// ─── System/SEO API tests ──────────────────────────────────

async function testSystemSEO() {
  console.log('▶ System API: unauthorized denied');
  const { GET: sysGET } = await import('../src/pages/api/system.ts');
  const resp1 = await sysGET({ request: makeRequest() });
  assert.strictEqual(resp1.status, 401);

  console.log('▶ System API: authorized returns data');
  const token = createSession('admin');
  const resp2 = await sysGET({ request: makeRequest({ headers: { cookie: `victor_session=${token}` } }) });
  assert.strictEqual(resp2.status, 200);
  const json2 = await resp2.json();
  assert.ok(Array.isArray(json2.integrations));
  assert.ok(Array.isArray(json2.logs));

  console.log('▶ SEO API: unauthorized denied');
  const { GET: seoGET } = await import('../src/pages/api/seo.ts');
  const resp3 = await seoGET({ request: makeRequest() });
  assert.strictEqual(resp3.status, 401);

  console.log('▶ SEO API: authorized returns data');
  const resp4 = await seoGET({ request: makeRequest({ headers: { cookie: `victor_session=${token}` } }) });
  assert.strictEqual(resp4.status, 200);
  const json4 = await resp4.json();
  assert.ok(Array.isArray(json4.pages));
}

// ─── Run all ────────────────────────────────────────────────

async function run() {
  let failed = 0;
  const tests = [
    { name: 'Auth', fn: testAuth },
    { name: 'Ingest', fn: testIngest },
    { name: 'Leads API', fn: testLeadsAPI },
    { name: 'System/SEO API', fn: testSystemSEO },
  ];
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name} passed`);
    } catch (e) {
      console.error(`✗ ${t.name} failed:`, e.message);
      failed++;
    }
  }
  console.log(`\nDone. ${tests.length - failed}/${tests.length} suites passed.`);
  process.exit(failed ? 1 : 0);
}

run();
