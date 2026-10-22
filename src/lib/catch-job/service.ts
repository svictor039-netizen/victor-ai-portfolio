/**
 * Catch_Job_4Me: серверная логика админки и API бота поверх SQLite сайта.
 * Только ручные запуски администратора: ни таймеров, ни очередей, ни фонового сбора.
 * Источник чтения — только MCP telegram-public через McpClient.
 */
import { db } from '../db';
import { McpClient, McpError, safeError, CATCH_JOB_MCP_URL } from './mcp-client';
import { CLASSIFIER_VERSION, TOPIC_CODES, TOPIC_LABELS, classifyTitle, isTopicCode, splitPost, type TopicCode, type ItemTopic } from './topics';
import { FRESH_WINDOW_MS, selectPicks } from './select';

export const SOURCE_HANDLES = ['job_developer', 'kwork_birzha'] as const;
const PAGE_SIZE = 20; // больше MCP не отдаёт за вызов
const MAX_PAGES = 10;
const RAW_LIMIT_BYTES = 200_000;
const RAW_KEEP_RUNS = 10;
const STALE_RUN_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 3600 * 1000;

type Row = Record<string, any>;

export class CatchJobError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/* ─── Настройки ─────────────────────────────────────────── */

function getSetting<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM cj_settings WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try { return JSON.parse(row.value) as T; } catch { return fallback; }
}

function setSetting(key: string, value: unknown) {
  db.prepare(
    'INSERT INTO cj_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).run(key, JSON.stringify(value), Date.now());
}

export function getSelectedTopics(): TopicCode[] {
  const saved = getSetting<unknown>('topics', TOPIC_CODES);
  return Array.isArray(saved) ? TOPIC_CODES.filter((c) => saved.includes(c)) : [...TOPIC_CODES];
}

export function setSelectedTopics(topics: unknown, actor: string): TopicCode[] {
  if (!Array.isArray(topics) || !topics.every(isTopicCode)) throw new CatchJobError('invalid_topics', 'Допустимы только пять фиксированных тематик');
  const next = TOPIC_CODES.filter((c) => topics.includes(c));
  const before = getSelectedTopics();
  setSetting('topics', next);
  audit(actor, 'catch_job.topics', 'cj_settings', 'topics', before, next);
  refreshBatchStatus();
  return next;
}

function audit(actor: string, action: string, objectType: string, objectId: string, before: unknown, after: unknown) {
  db.prepare('INSERT INTO audit_events (actor, action, object_type, object_id, before, after, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(actor, action, objectType, objectId, JSON.stringify(before), JSON.stringify(after), Math.floor(Date.now() / 1000));
}

function logSafe(level: 'info' | 'error', message: string, metadata?: Record<string, unknown>) {
  db.prepare('INSERT INTO system_logs (source, level, message, metadata, created_at) VALUES (?, ?, ?, ?, ?)')
    .run('catch_job', level, message, metadata ? JSON.stringify(metadata) : null, Math.floor(Date.now() / 1000));
}

/* ─── Источники ─────────────────────────────────────────── */

function sourceRows(): Row[] {
  return db.prepare('SELECT * FROM cj_sources ORDER BY id').all() as Row[];
}

function sourceByHandle(handle: unknown): Row {
  const row = typeof handle === 'string' ? (db.prepare('SELECT * FROM cj_sources WHERE handle = ?').get(handle) as Row | undefined) : undefined;
  if (!row) throw new CatchJobError('unknown_source', 'Источник не найден', 404);
  return row;
}

/** Меняются только «включён» и внутреннее примечание; username фиксирован. */
export function updateSource(handle: unknown, patch: { enabled?: unknown; note?: unknown }, actor: string) {
  const src = sourceByHandle(handle);
  const next = { enabled: src.enabled, note: src.note };
  if (patch.enabled !== undefined) {
    if (typeof patch.enabled !== 'boolean') throw new CatchJobError('invalid_enabled', 'enabled должен быть true/false');
    next.enabled = patch.enabled ? 1 : 0;
  }
  if (patch.note !== undefined) {
    if (typeof patch.note !== 'string' || patch.note.length > 1000) throw new CatchJobError('invalid_note', 'Примечание — строка до 1000 символов');
    next.note = patch.note.trim();
  }
  db.prepare('UPDATE cj_sources SET enabled = ?, note = ? WHERE id = ?').run(next.enabled, next.note, src.id);
  audit(actor, 'catch_job.source', 'cj_sources', src.handle, { enabled: src.enabled, note: src.note }, next);
  refreshBatchStatus();
}

function channelStatus(lastPostAt: number | null, now: number): string {
  if (!lastPostAt) return 'no_posts';
  const age = now - lastPostAt;
  if (age <= FRESH_WINDOW_MS) return 'active';
  if (age <= 7 * DAY_MS) return 'no_new_posts';
  return 'inactive';
}

/* ─── Запуски ───────────────────────────────────────────── */

function startRun(kind: 'mcp_check' | 'collect', actor: string): number {
  const now = Date.now();
  db.prepare("UPDATE cj_runs SET status = 'failed', finished_at = ?, summary = ? WHERE status = 'running' AND started_at < ?")
    .run(now, JSON.stringify({ error: 'Запуск прерван (истёк срок)' }), now - STALE_RUN_MS);
  try {
    const r = db.prepare("INSERT INTO cj_runs (kind, status, actor, started_at) VALUES (?, 'running', ?, ?)").run(kind, actor, now);
    return Number(r.lastInsertRowid);
  } catch {
    throw new CatchJobError('run_in_progress', 'Проверка уже выполняется — дождитесь окончания', 409);
  }
}

function finishRun(runId: number, status: 'ok' | 'partial' | 'failed', summary: unknown) {
  db.prepare('UPDATE cj_runs SET status = ?, finished_at = ?, summary = ? WHERE id = ?').run(status, Date.now(), JSON.stringify(summary), runId);
}

function runningRun(runId: unknown, kind: string): Row {
  const row = Number.isInteger(runId)
    ? (db.prepare("SELECT * FROM cj_runs WHERE id = ? AND kind = ? AND status = 'running'").get(runId as number, kind) as Row | undefined)
    : undefined;
  if (!row) throw new CatchJobError('run_not_running', 'Запуск не найден или уже завершён', 409);
  return row;
}

function saveRaw(runId: number, sourceId: number | null, tool: string, args: object, raw: string | null, errorCode: string | null) {
  const size = raw ? Buffer.byteLength(raw) : 0;
  const truncated = size > RAW_LIMIT_BYTES;
  const response = raw && truncated ? Buffer.from(raw).subarray(0, RAW_LIMIT_BYTES).toString('utf-8') : raw;
  db.prepare('INSERT INTO cj_mcp_raw (run_id, source_id, tool, args, response, size_bytes, truncated, error_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(runId, sourceId, tool, JSON.stringify(args), response, size, truncated ? 1 : 0, errorCode, Date.now());
}

function pruneRaw() {
  db.prepare('DELETE FROM cj_mcp_raw WHERE run_id NOT IN (SELECT id FROM cj_runs ORDER BY id DESC LIMIT ?)').run(RAW_KEEP_RUNS);
}

/* ─── Проверка подключения MCP ──────────────────────────── */

export async function checkMcp(actor: string, client = new McpClient()) {
  const runId = startRun('mcp_check', actor);
  const now = Date.now();
  try {
    const init = await client.initialize();
    const tools = await client.listTools();
    saveRaw(runId, null, 'tools/list', {}, JSON.stringify(tools), null);
    const status = { state: 'connected', checkedAt: now, lastOkAt: now, server: `${init.serverName} ${init.serverVersion}`.trim(), protocol: init.protocolVersion, tools, error: null };
    setSetting('mcp', status);
    upsertIntegration(true, null);
    finishRun(runId, 'ok', { tools });
    return status;
  } catch (err) {
    const safe = safeError(err);
    const prev = getSetting<Row>('mcp', {});
    const status = { ...prev, state: 'error', checkedAt: now, lastOkAt: prev.lastOkAt ?? null, error: safe };
    setSetting('mcp', status);
    saveRaw(runId, null, 'tools/list', {}, null, safe.code);
    upsertIntegration(false, safe.message);
    logSafe('error', 'MCP check failed', { code: safe.code });
    finishRun(runId, 'failed', { error: safe });
    return status;
  } finally {
    pruneRaw();
  }
}

function upsertIntegration(healthy: boolean, error: string | null) {
  db.prepare(
    `INSERT INTO integration_status (name, display_name, configured, healthy, environment, last_check, last_error, safe_metadata)
     VALUES ('telegram_mcp', 'Telegram Public MCP (Catch Job)', 1, ?, 'Node server', ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET healthy = excluded.healthy, last_check = excluded.last_check, last_error = excluded.last_error, safe_metadata = excluded.safe_metadata`
  ).run(healthy ? 1 : 0, Math.floor(Date.now() / 1000), error, JSON.stringify({ host: new URL(CATCH_JOB_MCP_URL).host }));
}

/* ─── Ручная проверка каналов ───────────────────────────── */

export function startCollect(actor: string) {
  const enabled = sourceRows().filter((s) => s.enabled);
  if (enabled.length === 0) throw new CatchJobError('no_sources', 'Все источники выключены');
  const runId = startRun('collect', actor);
  return { runId, sources: enabled.map((s) => s.handle as string) };
}

export async function collectSource(runIdInput: unknown, handle: unknown, client = new McpClient(), now = Date.now()) {
  const run = runningRun(runIdInput, 'collect');
  const runId = run.id as number;
  const src = sourceByHandle(handle);
  if (!src.enabled) throw new CatchJobError('source_disabled', 'Источник выключен');
  if (db.prepare('SELECT 1 FROM cj_run_sources WHERE run_id = ? AND source_id = ?').get(runId, src.id)) {
    throw new CatchJobError('already_collected', 'Этот канал в текущем запуске уже проверен', 409);
  }

  const started = Date.now();
  const windowStart = now - FRESH_WINDOW_MS;
  const result = { status: 'ok', calls: 0, postsRead: 0, postsNew: 0, itemsNew: 0, lastPostAt: null as number | null, oldestPostAt: null as number | null, windowCovered: false, diagnostic: '' };

  try {
    const info = await client.getChannelInfo(src.handle);
    result.calls++;
    saveRaw(runId, src.id, 'get_channel_info', { channel: src.handle }, info.raw, null);
    db.prepare('UPDATE cj_sources SET title = ?, subscriber_count = ? WHERE id = ?').run(info.data.title, info.data.subscriberCount, src.id);

    let before: number | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const args = before ? { channel: src.handle, limit: PAGE_SIZE, before_post_id: before } : { channel: src.handle, limit: PAGE_SIZE };
      const res = await client.getLatestPosts(src.handle, PAGE_SIZE, before);
      result.calls++;
      saveRaw(runId, src.id, 'get_latest_posts', args, res.raw, null);
      if (res.data.length === 0) { result.windowCovered = true; break; }

      const known = storePosts(src, runId, res.data, result);
      const oldest = Math.min(...res.data.map((p) => Date.parse(p.timestamp)));
      result.oldestPostAt = result.oldestPostAt === null ? oldest : Math.min(result.oldestPostAt, oldest);
      // Дальше не идём: окно 72 ч пройдено или страница целиком уже сохранена ранее
      if (oldest < windowStart || known === res.data.length) { result.windowCovered = true; break; }
      before = Math.min(...res.data.map((p) => p.id));
    }

    const last = db.prepare('SELECT post_id, posted_at FROM cj_posts WHERE source_id = ? ORDER BY posted_at DESC, post_id DESC LIMIT 1').get(src.id) as Row | undefined;
    result.lastPostAt = last?.posted_at ?? null;
    result.status = channelStatus(result.lastPostAt, now);
    result.diagnostic =
      `Прочитано ${result.postsRead} постов за ${result.calls} вызов(а) MCP, новых постов ${result.postsNew}, новых заказов ${result.itemsNew}. ` +
      (result.windowCovered ? 'Окно 72 ч покрыто.' : `Окно 72 ч покрыто частично (лимит ${MAX_PAGES} страниц).`);
    db.prepare('UPDATE cj_sources SET status = ?, last_checked_at = ?, last_post_id = ?, last_post_at = ?, last_error = NULL WHERE id = ?')
      .run(result.status, now, last?.post_id ?? null, result.lastPostAt, src.id);
  } catch (err) {
    const safe = safeError(err);
    result.status = 'error';
    result.diagnostic = `${safe.message} [${safe.code}]`;
    saveRaw(runId, src.id, 'get_latest_posts', { channel: src.handle }, null, safe.code);
    db.prepare("UPDATE cj_sources SET status = 'error', last_checked_at = ?, last_error = ? WHERE id = ?").run(now, result.diagnostic, src.id);
    logSafe('error', 'Channel check failed', { channel: src.handle, code: safe.code });
    if (!(err instanceof McpError)) console.error('[catch-job] collect error', (err as Error)?.name);
  }

  db.prepare(
    `INSERT INTO cj_run_sources (run_id, source_id, status, calls, posts_read, posts_new, items_new, last_post_at, oldest_post_at, window_covered, duration_ms, diagnostic)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(runId, src.id, result.status, result.calls, result.postsRead, result.postsNew, result.itemsNew, result.lastPostAt, result.oldestPostAt, result.windowCovered ? 1 : 0, Date.now() - started, result.diagnostic);
  return { handle: src.handle, ...result };
}

/** Сохраняет посты и заказы без дублей. Возвращает число уже известных постов. */
function storePosts(src: Row, runId: number, posts: { id: number; url: string; text: string; views: string; timestamp: string }[], acc: { postsRead: number; postsNew: number; itemsNew: number }) {
  let known = 0;
  const insPost = db.prepare('INSERT OR IGNORE INTO cj_posts (source_id, post_id, url, text, views, posted_at, first_run_id, last_run_id, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const touch = db.prepare('UPDATE cj_posts SET last_run_id = ?, views = ? WHERE source_id = ? AND post_id = ?');
  const getPost = db.prepare('SELECT id FROM cj_posts WHERE source_id = ? AND post_id = ?');
  const insItem = db.prepare('INSERT OR IGNORE INTO cj_items (post_ref, item_index, item_key, title, topic, tags, classifier_version, posted_at, classified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const p of posts) {
      acc.postsRead++;
      const postedAt = Date.parse(p.timestamp);
      const r = insPost.run(src.id, p.id, p.url, p.text, p.views, postedAt, runId, runId, Date.now());
      if (Number(r.changes) === 0) {
        known++;
        touch.run(runId, p.views, src.id, p.id);
        continue;
      }
      acc.postsNew++;
      const postRef = (getPost.get(src.id, p.id) as Row).id;
      for (const it of splitPost(src.handle, p.text)) {
        const c = classifyTitle(it.title);
        const ir = insItem.run(postRef, it.index, `${src.handle}/${p.id}#${it.index}`, it.title, c.topic, JSON.stringify(c.tags), CLASSIFIER_VERSION, postedAt, Date.now());
        acc.itemsNew += Number(ir.changes);
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
  return known;
}

export function finishCollect(runIdInput: unknown, now = Date.now()) {
  const run = runningRun(runIdInput, 'collect');
  const rows = db.prepare('SELECT s.handle, r.status FROM cj_run_sources r JOIN cj_sources s ON s.id = r.source_id WHERE r.run_id = ?').all(run.id) as Row[];
  const failed = rows.filter((r) => r.status === 'error').length;
  const status = rows.length === 0 || failed === rows.length ? 'failed' : failed > 0 ? 'partial' : 'ok';
  recomputePicks(run.id, now);
  refreshBatchStatus();
  finishRun(run.id, status, { sources: rows });
  pruneRaw();
  return { runId: run.id, status };
}

/* ─── Подборка: 1 заказ × 1 тематика × 1 канал ──────────── */

function recomputePicks(runId: number | null, now: number) {
  const items = (db.prepare(
    `SELECT i.id, i.item_key, i.topic, i.posted_at, s.handle FROM cj_items i
     JOIN cj_posts p ON p.id = i.post_ref JOIN cj_sources s ON s.id = p.source_id
     WHERE i.posted_at >= ?`
  ).all(now - FRESH_WINDOW_MS) as Row[]).map((r) => ({ id: r.id, itemKey: r.item_key, sourceHandle: r.handle, topic: r.topic as ItemTopic, postedAt: r.posted_at }));
  const picks = selectPicks(items, [...SOURCE_HANDLES], TOPIC_CODES, now);
  const upsert = db.prepare(
    `INSERT INTO cj_picks (source_id, topic, item_id, run_id, computed_at) VALUES ((SELECT id FROM cj_sources WHERE handle = ?), ?, ?, ?, ?)
     ON CONFLICT(source_id, topic) DO UPDATE SET item_id = excluded.item_id, run_id = excluded.run_id, computed_at = excluded.computed_at`
  );
  for (const p of picks) upsert.run(p.sourceHandle, p.topic, p.item?.id ?? null, runId, now);
}

export function updateItemFlags(itemKey: unknown, patch: { excluded?: unknown; comment?: unknown }, actor: string) {
  const item = typeof itemKey === 'string' ? (db.prepare('SELECT id FROM cj_items WHERE item_key = ?').get(itemKey) as Row | undefined) : undefined;
  if (!item) throw new CatchJobError('unknown_item', 'Заказ не найден', 404);
  const prev = (db.prepare('SELECT excluded, comment FROM cj_item_flags WHERE item_id = ?').get(item.id) as Row | undefined) ?? { excluded: 0, comment: '' };
  const next = { excluded: prev.excluded, comment: prev.comment };
  if (patch.excluded !== undefined) {
    if (typeof patch.excluded !== 'boolean') throw new CatchJobError('invalid_excluded', 'excluded должен быть true/false');
    next.excluded = patch.excluded ? 1 : 0;
  }
  if (patch.comment !== undefined) {
    if (typeof patch.comment !== 'string' || patch.comment.length > 1000) throw new CatchJobError('invalid_comment', 'Комментарий — строка до 1000 символов');
    next.comment = patch.comment.trim();
  }
  db.prepare(
    'INSERT INTO cj_item_flags (item_id, excluded, comment, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(item_id) DO UPDATE SET excluded = excluded.excluded, comment = excluded.comment, updated_at = excluded.updated_at'
  ).run(item.id, next.excluded, next.comment, Date.now());
  audit(actor, 'catch_job.item', 'cj_items', itemKey as string, prev, next);
  refreshBatchStatus();
}

/* ─── Пакет для бота ────────────────────────────────────── */

function batchCandidates(): Row[] {
  const topics = getSelectedTopics();
  return (db.prepare(
    `SELECT i.item_key, i.title, i.topic, i.posted_at, p.url AS post_url, s.handle
     FROM cj_picks k JOIN cj_items i ON i.id = k.item_id JOIN cj_posts p ON p.id = i.post_ref JOIN cj_sources s ON s.id = k.source_id
     LEFT JOIN cj_item_flags f ON f.item_id = i.id
     WHERE s.enabled = 1 AND COALESCE(f.excluded, 0) = 0
     ORDER BY s.id, k.topic`
  ).all() as Row[]).filter((r) => (topics as string[]).includes(r.topic));
}

const signatureOf = (cards: Row[]) => cards.map((c) => c.item_key).sort().join('|');

function actualBatch(): Row | undefined {
  return db.prepare("SELECT * FROM cj_bot_batches WHERE status = 'actual' ORDER BY id DESC LIMIT 1").get() as Row | undefined;
}

/**
 * Помечает актуальный пакет устаревшим, если состав подборки с ним разошёлся
 * (исключение/возврат карточки, тематики, включение канала, новая проверка каналов).
 * Обратно в «актуален» пакет не возвращается — только новый пакет кнопкой «Обновить».
 */
export function refreshBatchStatus(): boolean {
  const actual = actualBatch();
  if (!actual || actual.signature === signatureOf(batchCandidates())) return false;
  db.prepare("UPDATE cj_bot_batches SET status = 'stale', stale_at = ? WHERE status = 'actual'").run(Date.now());
  return true;
}

/**
 * Готовит пакет кратких карточек. Повторное нажатие без изменений возвращает тот же пакет;
 * если пакет устарел — создаётся новый с новым номером, старый остаётся в истории.
 */
export function prepareBotBatch(actor: string) {
  refreshBatchStatus();
  const cards = batchCandidates();
  if (cards.length === 0) throw new CatchJobError('empty_batch', 'Нет карточек для пакета: подборка пуста или всё исключено');
  const signature = signatureOf(cards);
  const actual = actualBatch();
  if (actual && actual.signature === signature) return { batchId: actual.id as number, created: false, cardsCount: cards.length, replacedBatchId: null };
  const previous = db.prepare('SELECT id FROM cj_bot_batches ORDER BY id DESC LIMIT 1').get() as Row | undefined;

  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare("UPDATE cj_bot_batches SET status = 'stale', stale_at = COALESCE(stale_at, ?) WHERE status = 'actual'").run(Date.now());
    const r = db.prepare('INSERT INTO cj_bot_batches (actor, cards_count, signature, created_at) VALUES (?, ?, ?, ?)').run(actor, cards.length, signature, Date.now());
    const batchId = Number(r.lastInsertRowid);
    const ins = db.prepare('INSERT INTO cj_bot_cards (batch_id, item_key, source, topic, title, posted_at, post_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const c of cards) ins.run(batchId, c.item_key, c.handle, c.topic, c.title, c.posted_at, c.post_url);
    db.exec('COMMIT');
    audit(actor, 'catch_job.batch', 'cj_bot_batches', String(batchId), previous ? { replaced: previous.id } : null, { cards: cards.length });
    return { batchId, created: true, cardsCount: cards.length, replacedBatchId: (previous?.id as number | undefined) ?? null };
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
}

/** Краткая карточка для бота: только тематика, заголовок, дата, канал и ссылка на пост. */
function toBotCard(r: Row) {
  return {
    card_id: r.id as number,
    item_key: r.item_key as string,
    topic: r.topic as string,
    topic_label: TOPIC_LABELS[r.topic as ItemTopic],
    title: r.title as string,
    posted_at: new Date(r.posted_at).toISOString(),
    source: `@${r.source}`,
    post_url: r.post_url as string,
  };
}

/** Для бота — только последний актуальный пакет; устаревший по номеру не отдаётся (410). */
export function getBotBatch(batchId?: number, topics?: TopicCode[]) {
  const batch = batchId ? (db.prepare('SELECT * FROM cj_bot_batches WHERE id = ?').get(batchId) as Row | undefined) : actualBatch();
  if (!batch) return null;
  if (batch.status !== 'actual') throw new CatchJobError('batch_stale', 'Пакет устарел — запросите актуальный', 410);
  const cards = (db.prepare('SELECT * FROM cj_bot_cards WHERE batch_id = ? ORDER BY id').all(batch.id) as Row[])
    .filter((r) => !topics || (topics as string[]).includes(r.topic))
    .map(toBotCard);
  return { batch_id: batch.id as number, created_at: new Date(batch.created_at).toISOString(), cards };
}

const USER_REF_RE = /^[A-Za-z0-9_-]{1,64}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Отчёт бота о доставке. Повтор того же отчёта не создаёт дублей. */
export function recordDeliveries(body: unknown) {
  const b = body as Row;
  if (!b || typeof b !== 'object') throw new CatchJobError('invalid_body', 'Ожидается JSON-объект');
  if (!Number.isInteger(b.batch_id)) throw new CatchJobError('invalid_batch', 'batch_id обязателен');
  if (typeof b.request_id !== 'string' || !REQUEST_ID_RE.test(b.request_id)) throw new CatchJobError('invalid_request_id', 'request_id: 8–64 символа [A-Za-z0-9_-]');
  if (b.mode !== 'dry_run' && b.mode !== 'sent') throw new CatchJobError('invalid_mode', 'mode: dry_run или sent');
  if (!Array.isArray(b.deliveries) || b.deliveries.length === 0 || b.deliveries.length > 500) throw new CatchJobError('invalid_deliveries', 'deliveries: от 1 до 500 записей');
  const batchCards = new Set((db.prepare('SELECT id FROM cj_bot_cards WHERE batch_id = ?').all(b.batch_id) as Row[]).map((r) => r.id as number));
  if (batchCards.size === 0) throw new CatchJobError('unknown_batch', 'Пакет не найден', 404);

  const ins = db.prepare('INSERT OR IGNORE INTO cj_bot_deliveries (card_id, user_ref, mode, request_id, reported_at) VALUES (?, ?, ?, ?, ?)');
  let accepted = 0;
  let duplicates = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const d of b.deliveries as Row[]) {
      if (!d || typeof d.user_ref !== 'string' || !USER_REF_RE.test(d.user_ref) || !Array.isArray(d.card_ids)) throw new CatchJobError('invalid_delivery', 'Каждая запись: user_ref и card_ids');
      for (const cardId of d.card_ids) {
        if (!batchCards.has(cardId)) throw new CatchJobError('card_not_in_batch', 'Карточка не принадлежит пакету');
        const r = ins.run(cardId, d.user_ref, b.mode, b.request_id, Date.now());
        if (Number(r.changes) > 0) accepted++; else duplicates++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
  return { accepted, duplicates };
}

/* ─── Состояние страницы админки ────────────────────────── */

export function getAdminState(now = Date.now()) {
  const topics = getSelectedTopics();
  const sources = sourceRows();
  const lastCollect = db.prepare("SELECT * FROM cj_runs WHERE kind = 'collect' ORDER BY id DESC LIMIT 1").get() as Row | undefined;
  const runSources = lastCollect
    ? (db.prepare('SELECT r.*, s.handle FROM cj_run_sources r JOIN cj_sources s ON s.id = r.source_id WHERE r.run_id = ?').all(lastCollect.id) as Row[])
    : [];

  const posts: Record<string, Row[]> = {};
  for (const s of sources) {
    posts[s.handle] = (db.prepare('SELECT id, post_id, url, text, views, posted_at, first_run_id FROM cj_posts WHERE source_id = ? ORDER BY posted_at DESC, post_id DESC LIMIT 20').all(s.id) as Row[]).map((p) => ({
      ...p,
      items: (db.prepare('SELECT item_key, title, topic, tags FROM cj_items WHERE post_ref = ? ORDER BY item_index').all(p.id) as Row[]).map((i) => ({ ...i, tags: JSON.parse(i.tags) })),
    }));
  }

  const picks = db.prepare(
    `SELECT s.handle, s.enabled, k.topic, k.computed_at, i.item_key, i.title, i.posted_at, i.topic AS item_topic, p.url AS post_url,
            COALESCE(f.excluded, 0) AS excluded, COALESCE(f.comment, '') AS comment
     FROM cj_picks k JOIN cj_sources s ON s.id = k.source_id
     LEFT JOIN cj_items i ON i.id = k.item_id LEFT JOIN cj_posts p ON p.id = i.post_ref LEFT JOIN cj_item_flags f ON f.item_id = i.id
     ORDER BY s.id, k.topic`
  ).all() as Row[];

  const deliveriesOf = (batchId: number) =>
    db.prepare('SELECT mode, COUNT(*) AS n FROM cj_bot_deliveries d JOIN cj_bot_cards c ON c.id = d.card_id WHERE c.batch_id = ? GROUP BY mode').all(batchId) as { mode: string; n: number }[];
  const batches = (db.prepare('SELECT id, status, cards_count, created_at, stale_at FROM cj_bot_batches ORDER BY id DESC LIMIT 10').all() as Row[]).map((b) => ({
    id: b.id as number, status: b.status as 'actual' | 'stale', cardsCount: b.cards_count as number,
    createdAt: b.created_at as number, staleAt: (b.stale_at as number | null) ?? null, deliveries: deliveriesOf(b.id),
  }));

  return {
    now,
    windowHours: FRESH_WINDOW_MS / 3600000,
    mcp: { url: CATCH_JOB_MCP_URL, ...getSetting<Row>('mcp', { state: 'not_checked', checkedAt: null, lastOkAt: null, error: null }) },
    sources: sources.map((s) => ({
      handle: s.handle, title: s.title, subscriberCount: s.subscriber_count, enabled: !!s.enabled, note: s.note,
      status: s.enabled ? s.status : 'disabled', lastCheckedAt: s.last_checked_at, lastPostAt: s.last_post_at, lastError: s.last_error,
    })),
    topics: { selected: topics, all: TOPIC_CODES.map((c) => ({ code: c, label: TOPIC_LABELS[c] })) },
    lastRun: lastCollect ? { id: lastCollect.id, status: lastCollect.status, startedAt: lastCollect.started_at, finishedAt: lastCollect.finished_at } : null,
    runSources: runSources.map((r) => ({
      handle: r.handle, status: r.status, calls: r.calls, postsRead: r.posts_read, postsNew: r.posts_new, itemsNew: r.items_new,
      lastPostAt: r.last_post_at, windowCovered: !!r.window_covered, durationMs: r.duration_ms, diagnostic: r.diagnostic,
    })),
    posts,
    picks: picks.map((p) => ({
      handle: p.handle, sourceEnabled: !!p.enabled, topic: p.topic, computedAt: p.computed_at,
      item: p.item_key ? { itemKey: p.item_key, title: p.title, postedAt: p.posted_at, postUrl: p.post_url, excluded: !!p.excluded, comment: p.comment } : null,
    })),
    // batch — последний подготовленный пакет (актуальный или устаревший), batches — история
    batch: batches[0] ?? null,
    batches,
  };
}
