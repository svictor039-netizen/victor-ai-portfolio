/**
 * Регрессия: Catch Job за nginx не должен получать ложный 403 по Origin.
 * nginx проксирует https://ailabstudio.ru на внутренний localhost:<порт> и передаёт
 * X-Forwarded-Host/X-Forwarded-Proto. Только security.allowedDomains в astro.config.mjs
 * позволяет адаптеру восстановить настоящий request.url — проверяем это на собранном сервере.
 *
 * Требует собранный сервер: npm run build
 * Запуск: node --test tests/catch-job-nginx-origin.test.mjs
 * Работает на временной БД, без сети и без реальных секретов.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ENTRY = join(process.cwd(), 'dist', 'server', 'entry.mjs');
const SITE = 'ailabstudio.ru';
const tmpDir = mkdtempSync(join(tmpdir(), 'catch-job-nginx-'));
const dbPath = join(tmpDir, 'test.db');
let server;
let port;
let cookie;

function freePort() {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port: p } = s.address();
      s.close(() => resolve(p));
    });
  });
}

/** HTTP-запрос с произвольным Host — как его отправляет nginx на внутренний порт. */
function send(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const req = httpRequest(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: {
          host: `localhost:${port}`,
          ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (text += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode, headers: res.headers, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Заголовки, которые nginx добавляет для https://ailabstudio.ru
const NGINX = { 'x-forwarded-host': SITE, 'x-forwarded-proto': 'https', 'x-forwarded-for': '203.0.113.10' };
const TOPICS = { kind: 'topics', topics: ['sites', 'bots'] };

before(async () => {
  assert.ok(existsSync(ENTRY), 'нет dist/server/entry.mjs — сначала выполните npm run build');
  port = await freePort();
  server = spawn(process.execPath, [ENTRY], {
    env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, HOST: '127.0.0.1', PORT: String(port), DATABASE_PATH: dbPath, NODE_ENV: 'production' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  for (let i = 0; i < 100; i++) {
    try {
      // Первый запрос к API заодно создаёт схему во временной БД
      const r = await send('GET', '/api/catch-job/state/');
      if (r.status === 401) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const token = randomBytes(32).toString('hex');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA busy_timeout = 5000');
  db.prepare('INSERT INTO sessions (id, username, created_at, expires_at) VALUES (?, ?, ?, ?)').run(token, 'admin', Date.now(), Date.now() + 3600_000);
  db.close();
  cookie = `victor_session=${token}`;
});

after(async () => {
  // На Windows файл БД освобождается только после выхода процесса сервера
  if (server && server.exitCode === null) {
    await new Promise((resolve) => { server.once('exit', resolve); server.kill(); });
  }
  rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

test('за nginx: Origin https://ailabstudio.ru с валидной сессией проходит (нет ложного 403)', async () => {
  const r = await send('PATCH', '/api/catch-job/settings/', { ...NGINX, origin: `https://${SITE}`, cookie }, TOPICS);
  assert.equal(r.status, 200, `ожидался 200, получен ${r.status} ${JSON.stringify(r.json)}`);
  assert.equal(r.json.ok, true);
  const state = await send('GET', '/api/catch-job/state/', { ...NGINX, cookie });
  assert.equal(state.status, 200);
  assert.deepEqual(state.json.state.topics.selected, ['sites', 'bots']);
});

test('за nginx: чужой Origin получает 403', async () => {
  const r = await send('PATCH', '/api/catch-job/settings/', { ...NGINX, origin: 'https://evil.example', cookie }, TOPICS);
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 'bad_origin');
});

test('подменённый X-Forwarded-Host не принимается: request.url остаётся внутренним, 403', async () => {
  const r = await send('PATCH', '/api/catch-job/settings/', { ...NGINX, 'x-forwarded-host': 'evil.example', origin: 'https://evil.example', cookie }, TOPICS);
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 'bad_origin');
});

test('Origin домена, но X-Forwarded-Host не из allowedDomains: адрес не восстанавливается, 403', async () => {
  const r = await send('PATCH', '/api/catch-job/settings/', { ...NGINX, 'x-forwarded-host': 'evil.example', origin: `https://${SITE}`, cookie }, TOPICS);
  assert.equal(r.status, 403);
  assert.equal(r.json.code, 'bad_origin');
});

test('без forwarded-заголовков Origin домена не совпадает с внутренним адресом: 403 (исходная ситуация)', async () => {
  const r = await send('PATCH', '/api/catch-job/settings/', { origin: `https://${SITE}`, cookie }, TOPICS);
  assert.equal(r.status, 403);
});

test('без сессии: API — 401, страница — редирект на вход (как до правки)', async () => {
  const api = await send('PATCH', '/api/catch-job/settings/', { ...NGINX, origin: `https://${SITE}` }, TOPICS);
  assert.equal(api.status, 401);
  assert.equal(api.json.code, 'unauthorized');
  const page = await send('GET', '/admin/catch-job/', { ...NGINX });
  assert.equal(page.status, 302);
  assert.match(page.headers.location, /\/admin\/login\/$/);
});
