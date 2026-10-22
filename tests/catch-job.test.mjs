/**
 * Catch_Job_4Me: разбор постов, классификация, правило отбора, миграции,
 * ручная проверка каналов через поддельный MCP, ошибки MCP, доступ к API.
 * Запуск: node --import tsx --test tests/catch-job.test.mjs
 * Живая проверка серверного клиента против настоящего MCP — только при CATCH_JOB_LIVE_MCP=1.
 * Тест работает на временной БД и не трогает data/victor.db.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const tmpDir = mkdtempSync(join(tmpdir(), 'catch-job-'));
process.env.DATABASE_PATH = join(tmpDir, 'test.db');
const BOT_TOKEN = 'test-token-'.padEnd(48, 'x');
process.env.CATCH_JOB_BOT_API_TOKEN = BOT_TOKEN;

const { db } = await import('../src/lib/db.ts');
const { runMigrations, migrations } = await import('../src/lib/migrations.ts');
const { splitPost, classifyTitle, decodeEntities } = await import('../src/lib/catch-job/topics.ts');
const { selectPicks } = await import('../src/lib/catch-job/select.ts');
const { McpClient, McpError } = await import('../src/lib/catch-job/mcp-client.ts');
const svc = await import('../src/lib/catch-job/service.ts');
const { createSession } = await import('../src/lib/auth.ts');
const stateRoute = await import('../src/pages/api/catch-job/state.ts');
const collectRoute = await import('../src/pages/api/catch-job/collect.ts');
const botBatchRoute = await import('../src/pages/api/catch-job/bot/batch.ts');
const botFeedRoute = await import('../src/pages/api/catch-job/bot/feed.ts');
const botDeliveriesRoute = await import('../src/pages/api/catch-job/bot/deliveries.ts');

after(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

const H = 3600 * 1000;
const NOW = Date.parse('2026-10-22T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString();

/* ─── Поддельный MCP: отвечает по протоколу JSON-RPC из заданных постов ─── */

function fakeMcp(channels, { failChannel = null, failMode = 'network' } = {}) {
  const calls = [];
  const fetchImpl = async (_url, init) => {
    const msg = JSON.parse(init.body);
    calls.push(msg);
    const reply = (result) => new Response(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (msg.method === 'initialize') return reply({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fake-mcp', version: '0' } });
    if (msg.method === 'notifications/initialized') return new Response(null, { status: 202 });
    if (msg.method === 'tools/list') return reply({ tools: [{ name: 'get_channel_info' }, { name: 'get_latest_posts' }, { name: 'search_posts' }] });
    const { name, arguments: args } = msg.params;
    if (args.channel === failChannel) {
      if (failMode === 'network') throw new TypeError('fetch failed');
      if (failMode === 'garbage') return new Response('<html>oops</html>', { status: 200, headers: { 'content-type': 'text/html' } });
    }
    const posts = channels[args.channel];
    if (!posts) return new Response(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: `Public channel not found: ${args.channel}` } }), { status: 200 });
    const text = (v) => reply({ content: [{ type: 'text', text: JSON.stringify(v) }] });
    if (name === 'get_channel_info') return text({ title: `Канал ${args.channel}`, description: '', avatarUrl: null, subscriberCount: '10 subscribers', url: `https://t.me/s/${args.channel}`, channel: args.channel });
    const sorted = [...posts].sort((a, b) => b.id - a.id).filter((p) => !args.before_post_id || p.id < args.before_post_id);
    return text(sorted.slice(0, args.limit ?? 10));
  };
  return { fetchImpl, calls };
}

const post = (channel, id, hoursAgo, text) => ({ id, channel, url: `https://t.me/${channel}/${id}`, text, imageUrls: [], views: '5', timestamp: iso(NOW - hoursAgo * H), author: 'x' });

const JD = [
  post('job_developer', 101, 1, '⚡ Лендинг на Tilda + заготовка под блог\n👉 УЗНАТЬ БОЛЬШЕ | #tilda\n\n⚡ Доработка Telegram-бота для записи\n👉 УЗНАТЬ БОЛЬШЕ\n\n‼️Больше проектов в нашем боте 🤖'),
  post('job_developer', 100, 3, '⚡ Создание сайта\n👉 УЗНАТЬ БОЛЬШЕ'),
  post('job_developer', 99, 5, '🔥 За последние сутки наш Фриланс-бот нашел:\n💻 27 проектов'),
  post('job_developer', 98, 80, '⚡ Разработать вебприложение для склада\n👉 УЗНАТЬ БОЛЬШЕ'),
];
const KW = [
  post('kwork_birzha', 501, 2, 'Создание сайта на Tilda, настройка CRM и Webhook\n\nОписание задачи\n\nБюджет: 30000р\n\nПроект: 1\nПокупатель: buyer_a'),
  post('kwork_birzha', 500, 4, 'Разработка лендинга &laquo;Стоматология&raquo;\n\nБюджет: 10000р\nПокупатель: buyer_b'),
  post('kwork_birzha', 499, 6, 'Монтаж видео-роликов\n\nБюджет: 500р'),
];

async function runCollect(channels, opts) {
  const { fetchImpl } = fakeMcp(channels, opts);
  const { runId, sources } = svc.startCollect('admin');
  const results = [];
  for (const h of sources) results.push(await svc.collectSource(runId, h, new McpClient({ fetchImpl }), NOW));
  return { results, finish: svc.finishCollect(runId, NOW) };
}

/* ─── Разбор и классификация ─── */

test('split: job_developer — по строке ⚡, хвост и сводка не заказы; kwork — один пост = один заказ', () => {
  assert.deepEqual(splitPost('job_developer', JD[0].text).map((i) => i.title), ['Лендинг на Tilda + заготовка под блог', 'Доработка Telegram-бота для записи']);
  assert.deepEqual(splitPost('job_developer', '⚡\nСоздать сайт\n👉 УЗНАТЬ БОЛЬШЕ').map((i) => i.title), ['Создать сайт']);
  assert.equal(splitPost('job_developer', JD[2].text).length, 0);
  assert.equal(splitPost('job_developer', '').length, 0);
  assert.deepEqual(splitPost('kwork_birzha', KW[1].text), [{ index: 0, title: 'Разработка лендинга «Стоматология»' }]);
  assert.equal(decodeEntities('10&nbsp;008 &times; 2 &#x41;&#66;'), '10 008 × 2 AB');
});

test('classify: пять тематик, ничья по порядку, без совпадений — unclassified, детерминированно', () => {
  const cases = {
    'Лендинг на Tilda + заготовка под блог': 'sites',
    'Настроить тг и мах бота': 'bots',
    'Разработчик ИИагентов': 'ai',
    'Автоматизация ИИ-генерации SEO-статей для сайта': 'ai',
    'Настроить интеграцию телефонии Sipuni с amoCRM': 'integrations',
    'Разработать вебприложение (сайт)': 'webapps',
    'Разработка административной панели на React': 'webapps',
    'Создание сайта на Tilda, настройка CRM и Webhook': 'integrations',
    'Блокировать спам боты': 'unclassified',
    'Разработка ИИ-аватаров для генерации видео': 'unclassified',
    'Монтаж видео-роликов': 'unclassified',
  };
  for (const [title, topic] of Object.entries(cases)) assert.equal(classifyTitle(title).topic, topic, title);
  const c = classifyTitle('Доработка Telegram-бота и сайта для автоматизации ЧЗ/WB');
  assert.equal(c.topic, 'bots');
  assert.ok(c.tags.includes('sites'));
  assert.deepEqual(classifyTitle('Создание сайта'), classifyTitle('Создание сайта'));
});

/* ─── Правило отбора ─── */

test('select: самый свежий в теме и канале; по карточке от каждого канала; пусто; дубликат не дублируется; старше 72 ч не берётся', () => {
  const it = (id, src, topic, hoursAgo, key = `${src}/${id}#0`) => ({ id, itemKey: key, sourceHandle: src, topic, postedAt: NOW - hoursAgo * H });
  const items = [
    it(1, 'job_developer', 'sites', 5),
    it(2, 'job_developer', 'sites', 1), // свежее — остаётся
    it(3, 'job_developer', 'sites', 3),
    it(4, 'kwork_birzha', 'sites', 2),
    it(5, 'kwork_birzha', 'sites', 2, 'kwork_birzha/4#0'), // дубликат исходного заказа
    it(6, 'job_developer', 'webapps', 80), // старше 72 ч
    it(7, 'job_developer', 'unclassified', 0.5),
  ];
  const picks = selectPicks(items, ['job_developer', 'kwork_birzha'], ['sites', 'bots', 'webapps'], NOW);
  const get = (s, t) => picks.find((p) => p.sourceHandle === s && p.topic === t).item;
  assert.equal(picks.length, 6);
  assert.equal(get('job_developer', 'sites').id, 2);
  assert.equal(get('kwork_birzha', 'sites').id, 4);
  assert.equal(get('job_developer', 'bots'), null);
  assert.equal(get('job_developer', 'webapps'), null);
  const keys = picks.filter((p) => p.item).map((p) => p.item.itemKey);
  assert.equal(new Set(keys).size, keys.length);
});

/* ─── Миграции ─── */

test('migrations: не меняют существующие таблицы и данные; повторный запуск — без изменений', () => {
  const copy = new DatabaseSync(':memory:');
  copy.exec("CREATE TABLE leads (id TEXT PRIMARY KEY, task TEXT); INSERT INTO leads VALUES ('l1', 'задача');");
  const before = copy.prepare("SELECT sql FROM sqlite_master WHERE name = 'leads'").get().sql;
  assert.deepEqual(runMigrations(copy), migrations.map((m) => m.version));
  assert.deepEqual(runMigrations(copy), []);
  assert.equal(copy.prepare("SELECT sql FROM sqlite_master WHERE name = 'leads'").get().sql, before);
  assert.equal(copy.prepare('SELECT task FROM leads').get().task, 'задача');
  assert.equal(copy.prepare('SELECT COUNT(*) AS n FROM cj_sources').get().n, 2);
  assert.throws(() => copy.prepare("INSERT INTO cj_sources (handle) VALUES ('other_channel')").run());
  copy.close();
});

/* ─── Ручная проверка каналов ─── */

test('collect: оба канала, без дублей при повторе, подборка по правилу, пустые ячейки', async () => {
  const first = await runCollect({ job_developer: JD, kwork_birzha: KW });
  assert.equal(first.finish.status, 'ok');
  const jd = first.results.find((r) => r.handle === 'job_developer');
  assert.equal(jd.status, 'active');
  assert.equal(jd.postsNew, 4);
  assert.equal(jd.itemsNew, 4); // 2 + 1 + 0 + 1
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM cj_mcp_raw').get().n > 0, true);

  const second = await runCollect({ job_developer: JD, kwork_birzha: KW });
  assert.equal(second.results.reduce((s, r) => s + r.postsNew + r.itemsNew, 0), 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM cj_posts').get().n, 7);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM cj_items').get().n, 7);

  const state = svc.getAdminState(NOW);
  const pick = (h, t) => state.picks.find((p) => p.handle === h && p.topic === t).item;
  assert.equal(pick('job_developer', 'sites').title, 'Лендинг на Tilda + заготовка под блог');
  assert.equal(pick('job_developer', 'bots').title, 'Доработка Telegram-бота для записи');
  assert.equal(pick('kwork_birzha', 'sites').title, 'Разработка лендинга «Стоматология»');
  assert.equal(pick('kwork_birzha', 'integrations').title, 'Создание сайта на Tilda, настройка CRM и Webhook');
  assert.equal(pick('job_developer', 'webapps'), null); // единственный заказ старше 72 ч
  assert.equal(pick('kwork_birzha', 'ai'), null);
});

test('collect: ошибка одного канала не ломает другой (partial), ошибки безопасны', async () => {
  const net = await runCollect({ job_developer: JD, kwork_birzha: KW }, { failChannel: 'kwork_birzha', failMode: 'network' });
  assert.equal(net.finish.status, 'partial');
  const kw = net.results.find((r) => r.handle === 'kwork_birzha');
  assert.equal(kw.status, 'error');
  assert.match(kw.diagnostic, /mcp_unreachable/);
  assert.doesNotMatch(kw.diagnostic, /workers\.dev|fetch failed/);

  const bad = await runCollect({ job_developer: JD, kwork_birzha: KW }, { failChannel: 'job_developer', failMode: 'garbage' });
  assert.match(bad.results.find((r) => r.handle === 'job_developer').diagnostic, /mcp_format_error/);
});

test('collect: параллельный запуск отклоняется (409)', () => {
  const { runId } = svc.startCollect('admin');
  assert.throws(() => svc.startCollect('admin'), (e) => e.status === 409);
  svc.finishCollect(runId, NOW);
});

test('MCP-клиент: сетевая ошибка, неверный ответ, канал не найден, слишком большой ответ', async () => {
  const net = new McpClient({ fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(net.listTools(), (e) => e instanceof McpError && e.code === 'mcp_unreachable');

  const http = new McpClient({ fetchImpl: async () => new Response('fail', { status: 502 }) });
  await assert.rejects(http.initialize(), (e) => e.code === 'mcp_http_error' && !e.message.includes('workers.dev'));

  const notFound = new McpClient(fakeMcp({}));
  await assert.rejects(notFound.getChannelInfo('no_such'), (e) => e.code === 'channel_not_found');

  const huge = new McpClient({ fetchImpl: async () => new Response('x'.repeat(1_100_000), { status: 200, headers: { 'content-type': 'application/json' } }) });
  await assert.rejects(huge.initialize(), (e) => e.code === 'mcp_too_large');

  const sse = new McpClient({
    fetchImpl: async (_u, init) => {
      const { id } = JSON.parse(init.body);
      return new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id, result: { protocolVersion: '2025-03-26', serverInfo: { name: 's' } } })}\n\n`, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    },
  });
  assert.equal((await sse.initialize()).protocolVersion, '2025-03-26');
});

test('checkMcp: ошибка подключения сохраняется безопасно, страница получает состояние', async () => {
  const status = await svc.checkMcp('admin', new McpClient({ fetchImpl: async () => { throw new TypeError('fetch failed'); } }));
  assert.equal(status.state, 'error');
  assert.equal(status.error.code, 'mcp_unreachable');
  const ok = await svc.checkMcp('admin', new McpClient(fakeMcp({})));
  assert.equal(ok.state, 'connected');
  assert.ok(svc.getAdminState().mcp.lastOkAt);
});

/* ─── Доступ ─── */

const call = (route, method, { url = 'http://localhost/api/x/', headers = {}, body } = {}) =>
  route[method]({ request: new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined }) });

test('admin API: без сессии 401; чужой Origin — 403; с сессией — 200', async () => {
  assert.equal((await call(stateRoute, 'GET')).status, 401);
  assert.equal((await call(collectRoute, 'POST', { body: { action: 'start' } })).status, 401);
  const cookie = `victor_session=${createSession('admin')}`;
  assert.equal((await call(stateRoute, 'GET', { headers: { cookie } })).status, 200);
  const foreign = await call(collectRoute, 'POST', { headers: { cookie, origin: 'https://evil.example', 'content-type': 'application/json' }, body: { action: 'start' } });
  assert.equal(foreign.status, 403);
});

test('пакет для бота и API бота: токен, краткие поля, фильтр тематик, идемпотентность', async () => {
  svc.setSelectedTopics(['sites', 'bots', 'integrations'], 'admin');
  const first = svc.prepareBotBatch('admin');
  assert.equal(first.created, true);
  assert.equal(first.cardsCount, 4);
  const again = svc.prepareBotBatch('admin');
  assert.deepEqual([again.created, again.batchId], [false, first.batchId]);

  const url = 'http://localhost/api/catch-job/bot/batch/';
  assert.equal((await call(botBatchRoute, 'GET', { url })).status, 401);
  assert.equal((await call(botBatchRoute, 'GET', { url, headers: { authorization: 'Bearer wrong-token' } })).status, 401);
  const auth = { authorization: `Bearer ${BOT_TOKEN}` };
  const res = await call(botBatchRoute, 'GET', { url, headers: auth });
  assert.equal(res.status, 200);
  const raw = await res.text();
  const batch = JSON.parse(raw);
  assert.equal(batch.cards.length, 4);
  for (const c of batch.cards) assert.deepEqual(Object.keys(c).sort(), ['card_id', 'item_key', 'post_url', 'posted_at', 'source', 'title', 'topic', 'topic_label']);
  assert.doesNotMatch(raw, /Бюджет|Покупатель|buyer_|Описание задачи|views|imageUrls/);

  const feed = await (await call(botFeedRoute, 'GET', { url: 'http://localhost/api/catch-job/bot/feed/?topics=bots', headers: auth })).json();
  assert.deepEqual(feed.cards.map((c) => c.topic), ['bots']);
  assert.equal((await call(botFeedRoute, 'GET', { url: 'http://localhost/api/catch-job/bot/feed/?topics=crypto', headers: auth })).status, 400);

  const report = { batch_id: batch.batch_id, request_id: 'req-00000001', mode: 'dry_run', deliveries: [{ user_ref: 'user-1', card_ids: batch.cards.map((c) => c.card_id) }] };
  const d1 = await (await call(botDeliveriesRoute, 'POST', { url, headers: { ...auth, 'content-type': 'application/json' }, body: report })).json();
  const d2 = await (await call(botDeliveriesRoute, 'POST', { url, headers: { ...auth, 'content-type': 'application/json' }, body: report })).json();
  assert.deepEqual([d1.accepted, d1.duplicates, d2.accepted, d2.duplicates], [4, 0, 0, 4]);
  assert.equal((await call(botDeliveriesRoute, 'POST', { url, body: report })).status, 401);
  const foreignCard = await call(botDeliveriesRoute, 'POST', { url, headers: auth, body: { ...report, deliveries: [{ user_ref: 'user-1', card_ids: [999999] }] } });
  assert.equal(foreignCard.status, 400);

  delete process.env.CATCH_JOB_BOT_API_TOKEN;
  assert.equal((await call(botBatchRoute, 'GET', { url, headers: auth })).status, 503);
  process.env.CATCH_JOB_BOT_API_TOKEN = BOT_TOKEN;
});

test('исключение администратора убирает карточку из следующего пакета', () => {
  const key = db.prepare("SELECT i.item_key FROM cj_picks k JOIN cj_items i ON i.id = k.item_id WHERE k.topic = 'bots'").get().item_key;
  svc.updateItemFlags(key, { excluded: true, comment: 'проверить вручную' }, 'admin');
  const b = svc.prepareBotBatch('admin');
  assert.equal(b.created, true);
  assert.equal(b.cardsCount, 3);
  assert.throws(() => svc.updateSource('job_developer', { enabled: 'yes' }, 'admin'));
  assert.throws(() => svc.updateSource('other', { enabled: true }, 'admin'), (e) => e.status === 404);
});

test('живой MCP: серверный клиент читает оба канала', { skip: process.env.CATCH_JOB_LIVE_MCP !== '1' }, async () => {
  const client = new McpClient();
  const tools = await client.listTools();
  assert.ok(tools.includes('get_latest_posts'));
  for (const ch of ['job_developer', 'kwork_birzha']) {
    const info = await client.getChannelInfo(ch);
    const posts = await client.getLatestPosts(ch, 5);
    assert.equal(info.data.channel, ch);
    assert.ok(posts.data.length > 0);
    console.log(`live @${ch}: «${info.data.title}», последний пост #${posts.data[0].id} ${posts.data[0].timestamp}`);
  }
});
