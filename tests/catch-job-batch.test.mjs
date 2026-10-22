/**
 * Catch_Job_4Me: устаревание и обновление пакета для бота.
 * 9 карточек → исключить одну → пакет №1 устарел → новый пакет из 8 → API бота отдаёт 8.
 * Запуск: node --import tsx --test tests/catch-job-batch.test.mjs
 * Тест работает на временной БД и не трогает data/victor.db.
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tmpDir = mkdtempSync(join(tmpdir(), 'catch-job-batch-'));
process.env.DATABASE_PATH = join(tmpDir, 'test.db');
const BOT_TOKEN = 'batch-test-token-'.padEnd(48, 'x');
process.env.CATCH_JOB_BOT_API_TOKEN = BOT_TOKEN;

const { db } = await import('../src/lib/db.ts');
const { McpClient } = await import('../src/lib/catch-job/mcp-client.ts');
const svc = await import('../src/lib/catch-job/service.ts');
const botBatchRoute = await import('../src/pages/api/catch-job/bot/batch.ts');
const botFeedRoute = await import('../src/pages/api/catch-job/bot/feed.ts');
const botDeliveriesRoute = await import('../src/pages/api/catch-job/bot/deliveries.ts');

after(() => {
  db.close();
  rmSync(tmpDir, { recursive: true, force: true });
});

const NOW = Date.parse('2026-10-22T12:00:00Z');
const post = (channel, id, hoursAgo, text) => ({ id, channel, url: `https://t.me/${channel}/${id}`, text, imageUrls: [], views: '1', timestamp: new Date(NOW - hoursAgo * 3600e3).toISOString(), author: 'x' });

// 5 тематик × 2 канала = 10 ячеек; у @kwork_birzha нет веб-приложений → 9 карточек
const CHANNELS = {
  job_developer: [
    post('job_developer', 10, 1, '⚡ Создание сайта\n👉 УЗНАТЬ БОЛЬШЕ\n\n⚡ Настроить тг и мах бота\n👉 УЗНАТЬ БОЛЬШЕ'),
    post('job_developer', 9, 2, '⚡ Разработчик ИИагентов\n👉 УЗНАТЬ БОЛЬШЕ\n\n⚡ Настроить интеграцию телефонии Sipuni с amoCRM\n👉 УЗНАТЬ БОЛЬШЕ'),
    post('job_developer', 8, 3, '⚡ Разработка административной панели на React\n👉 УЗНАТЬ БОЛЬШЕ'),
  ],
  kwork_birzha: [
    post('kwork_birzha', 104, 1, 'Разработка лендинга для стоматологии\n\nБюджет: 10000р\nПокупатель: buyer_a'),
    post('kwork_birzha', 103, 2, 'Создать чат бота на тему сказки\n\nБюджет: 3000р'),
    post('kwork_birzha', 102, 3, 'Разработчик ИИагентов\n\nБюджет: 50000р'),
    post('kwork_birzha', 101, 4, 'Диск Битрикс24\n\nБюджет: 2000р'),
  ],
};

function fakeFetch() {
  return async (_url, init) => {
    const msg = JSON.parse(init.body);
    const reply = (result) => new Response(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (msg.method === 'initialize') return reply({ protocolVersion: '2025-03-26', serverInfo: { name: 'fake' } });
    if (msg.method === 'notifications/initialized') return new Response(null, { status: 202 });
    const { name, arguments: args } = msg.params;
    const text = (v) => reply({ content: [{ type: 'text', text: JSON.stringify(v) }] });
    if (name === 'get_channel_info') return text({ title: args.channel, subscriberCount: '1', channel: args.channel });
    return text(CHANNELS[args.channel].filter((p) => !args.before_post_id || p.id < args.before_post_id));
  };
}

const auth = { authorization: `Bearer ${BOT_TOKEN}` };
const get = async (route, url) => {
  const res = await route.GET({ request: new Request(url, { headers: auth }) });
  return { status: res.status, body: await res.json() };
};

test('пакет: 9 карточек → исключить одну → №1 устарел → обновлённый пакет из 8 → бот получает 8', async () => {
  const { runId, sources } = svc.startCollect('admin');
  for (const h of sources) await svc.collectSource(runId, h, new McpClient({ fetchImpl: fakeFetch() }), NOW);
  svc.finishCollect(runId, NOW);

  const first = svc.prepareBotBatch('admin');
  assert.deepEqual([first.created, first.cardsCount], [true, 9]);
  assert.equal((await get(botBatchRoute, 'http://localhost/api/catch-job/bot/batch/')).body.cards.length, 9);

  // Исключаем одну карточку — пакет №1 устаревает, кнопка в админке меняется на «Обновить»
  const victim = svc.getAdminState(NOW).picks.find((p) => p.handle === 'kwork_birzha' && p.topic === 'bots').item;
  svc.updateItemFlags(victim.itemKey, { excluded: true }, 'admin');
  const stale = svc.getAdminState(NOW);
  assert.equal(stale.batch.id, first.batchId);
  assert.equal(stale.batch.status, 'stale');
  assert.ok(stale.batch.staleAt);

  // Устаревший пакет бот не получает: ни как последний, ни по номеру
  assert.equal((await get(botBatchRoute, 'http://localhost/api/catch-job/bot/batch/')).status, 404);
  const byId = await get(botBatchRoute, `http://localhost/api/catch-job/bot/batch/?batch_id=${first.batchId}`);
  assert.deepEqual([byId.status, byId.body.code], [410, 'batch_stale']);

  // Обновление: новый номер, 8 карточек, старый остаётся в истории как устаревший
  const second = svc.prepareBotBatch('admin');
  assert.equal(second.created, true);
  assert.equal(second.cardsCount, 8);
  assert.ok(second.batchId > first.batchId);
  assert.equal(second.replacedBatchId, first.batchId);
  const history = svc.getAdminState(NOW).batches;
  assert.deepEqual(history.map((b) => [b.id, b.status, b.cardsCount]), [[second.batchId, 'actual', 8], [first.batchId, 'stale', 9]]);

  const latest = await get(botBatchRoute, 'http://localhost/api/catch-job/bot/batch/');
  assert.equal(latest.status, 200);
  assert.equal(latest.body.batch_id, second.batchId);
  assert.equal(latest.body.cards.length, 8);
  assert.ok(!latest.body.cards.some((c) => c.item_key === victim.itemKey));
  const feed = await get(botFeedRoute, 'http://localhost/api/catch-job/bot/feed/?topics=sites,bots,ai,integrations,webapps');
  assert.deepEqual([feed.body.batch_id, feed.body.cards.length], [second.batchId, 8]);

  // Повторное нажатие без изменений — тот же пакет
  assert.deepEqual([svc.prepareBotBatch('admin').created, svc.prepareBotBatch('admin').batchId], [false, second.batchId]);
});

test('пакет: возврат карточки и смена тематик — тоже «устарел»; комментарий — нет', async () => {
  const actualId = () => svc.getAdminState(NOW).batches.find((b) => b.status === 'actual')?.id ?? null;
  const key = svc.getAdminState(NOW).picks.find((p) => p.handle === 'job_developer' && p.topic === 'sites').item.itemKey;

  const before = actualId();
  svc.updateItemFlags(key, { comment: 'только заметка' }, 'admin');
  assert.equal(actualId(), before);

  const excludedKey = db.prepare('SELECT i.item_key FROM cj_item_flags f JOIN cj_items i ON i.id = f.item_id WHERE f.excluded = 1').get().item_key;
  svc.updateItemFlags(excludedKey, { excluded: false }, 'admin');
  assert.equal(actualId(), null);
  const back = svc.prepareBotBatch('admin');
  assert.deepEqual([back.created, back.cardsCount], [true, 9]);

  svc.setSelectedTopics(['sites', 'bots'], 'admin');
  assert.equal(actualId(), null);
  assert.equal(svc.prepareBotBatch('admin').cardsCount, 4);
});

test('история доставки привязана к номеру пакета, включая устаревший', async () => {
  const batches = svc.getAdminState(NOW).batches;
  const staleBatch = batches.find((b) => b.status === 'stale');
  const cardId = db.prepare('SELECT id FROM cj_bot_cards WHERE batch_id = ? LIMIT 1').get(staleBatch.id).id;
  const body = { batch_id: staleBatch.id, request_id: 'late-report-01', mode: 'dry_run', deliveries: [{ user_ref: 'u1', card_ids: [cardId] }] };
  const res = await botDeliveriesRoute.POST({ request: new Request('http://localhost/x', { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).accepted, 1);
  assert.equal(svc.getAdminState(NOW).batches.find((b) => b.id === staleBatch.id).deliveries[0].n, 1);
});
