/**
 * Версионные миграции SQLite. Каждая применяется один раз в транзакции
 * и фиксируется в schema_migrations. Миграции только добавляют таблицы:
 * существующие таблицы и данные не меняются.
 * SQL хранится в коде (а не в файлах), чтобы попадать в серверную сборку.
 */
import type { DatabaseSync } from 'node:sqlite';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'catch_job',
    sql: `
      -- Настройки Catch Job: выбранные тематики, статус MCP (без секретов)
      CREATE TABLE cj_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Два фиксированных источника; username менять нельзя (CHECK)
      CREATE TABLE cj_sources (
        id INTEGER PRIMARY KEY,
        handle TEXT NOT NULL UNIQUE CHECK (handle IN ('job_developer', 'kwork_birzha')),
        title TEXT,
        subscriber_count TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'not_checked',
        last_checked_at INTEGER,
        last_post_id INTEGER,
        last_post_at INTEGER,
        last_error TEXT
      );
      INSERT INTO cj_sources (id, handle) VALUES (1, 'job_developer'), (2, 'kwork_birzha');

      -- Ручные запуски: проверка MCP или проверка каналов. Одновременно идёт один.
      CREATE TABLE cj_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kind TEXT NOT NULL CHECK (kind IN ('mcp_check', 'collect')),
        status TEXT NOT NULL CHECK (status IN ('running', 'ok', 'partial', 'failed')),
        actor TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        finished_at INTEGER,
        summary TEXT
      );
      CREATE UNIQUE INDEX cj_runs_one_running ON cj_runs (status) WHERE status = 'running';

      -- Результат запуска по каждому каналу
      CREATE TABLE cj_run_sources (
        run_id INTEGER NOT NULL REFERENCES cj_runs (id),
        source_id INTEGER NOT NULL REFERENCES cj_sources (id),
        status TEXT NOT NULL,
        calls INTEGER NOT NULL DEFAULT 0,
        posts_read INTEGER NOT NULL DEFAULT 0,
        posts_new INTEGER NOT NULL DEFAULT 0,
        items_new INTEGER NOT NULL DEFAULT 0,
        last_post_at INTEGER,
        oldest_post_at INTEGER,
        window_covered INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER,
        diagnostic TEXT,
        PRIMARY KEY (run_id, source_id)
      );

      -- Сырые ответы инструментов MCP (обрезаны по размеру, хранятся для последних запусков)
      CREATE TABLE cj_mcp_raw (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL REFERENCES cj_runs (id),
        source_id INTEGER REFERENCES cj_sources (id),
        tool TEXT NOT NULL,
        args TEXT NOT NULL,
        response TEXT,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        truncated INTEGER NOT NULL DEFAULT 0,
        error_code TEXT,
        created_at INTEGER NOT NULL
      );

      -- Посты каналов; повторная проверка не создаёт дублей
      CREATE TABLE cj_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL REFERENCES cj_sources (id),
        post_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        text TEXT NOT NULL,
        views TEXT,
        posted_at INTEGER NOT NULL,
        first_run_id INTEGER,
        last_run_id INTEGER,
        fetched_at INTEGER NOT NULL,
        UNIQUE (source_id, post_id)
      );
      CREATE INDEX cj_posts_source_time ON cj_posts (source_id, posted_at DESC);

      -- Заказы внутри поста и их классификация (одна основная тематика + теги)
      CREATE TABLE cj_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_ref INTEGER NOT NULL REFERENCES cj_posts (id),
        item_index INTEGER NOT NULL,
        item_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        topic TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        classifier_version TEXT NOT NULL,
        posted_at INTEGER NOT NULL,
        classified_at INTEGER NOT NULL,
        UNIQUE (post_ref, item_index)
      );
      CREATE INDEX cj_items_topic_time ON cj_items (topic, posted_at DESC);

      -- Ручные действия администратора над заказом: исключение и комментарий
      CREATE TABLE cj_item_flags (
        item_id INTEGER PRIMARY KEY REFERENCES cj_items (id),
        excluded INTEGER NOT NULL DEFAULT 0,
        comment TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL
      );

      -- Итоговая подборка: одна ячейка на канал × тематику (пустая — item_id NULL)
      CREATE TABLE cj_picks (
        source_id INTEGER NOT NULL REFERENCES cj_sources (id),
        topic TEXT NOT NULL,
        item_id INTEGER REFERENCES cj_items (id),
        run_id INTEGER REFERENCES cj_runs (id),
        computed_at INTEGER NOT NULL,
        PRIMARY KEY (source_id, topic)
      );

      -- Пакеты для бота, подготовленные вручную; карточки — только краткие поля
      CREATE TABLE cj_bot_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor TEXT NOT NULL,
        cards_count INTEGER NOT NULL,
        signature TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE cj_bot_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL REFERENCES cj_bot_batches (id),
        item_key TEXT NOT NULL,
        source TEXT NOT NULL,
        topic TEXT NOT NULL,
        title TEXT NOT NULL,
        posted_at INTEGER NOT NULL,
        post_url TEXT NOT NULL,
        UNIQUE (batch_id, item_key)
      );

      -- Отчёты бота о доставке. user_ref — внутренний id пользователя в боте, не Telegram ID.
      CREATE TABLE cj_bot_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL REFERENCES cj_bot_cards (id),
        user_ref TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('dry_run', 'sent')),
        request_id TEXT NOT NULL,
        reported_at INTEGER NOT NULL,
        UNIQUE (card_id, user_ref, mode)
      );
    `,
  },
  {
    version: 2,
    name: 'catch_job_batch_status',
    sql: `
      -- Пакет устаревает, когда состав подборки разошёлся с его карточками.
      -- Устаревший пакет остаётся в истории, API бота отдаёт только актуальный.
      ALTER TABLE cj_bot_batches ADD COLUMN status TEXT NOT NULL DEFAULT 'actual' CHECK (status IN ('actual', 'stale'));
      ALTER TABLE cj_bot_batches ADD COLUMN stale_at INTEGER;
    `,
  },
];

export function runMigrations(db: DatabaseSync, list: Migration[] = migrations): number[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at INTEGER NOT NULL
  )`);
  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((r) => r.version)
  );
  const done: number[] = [];
  for (const m of [...list].sort((a, b) => a.version - b.version)) {
    if (applied.has(m.version)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      // Другой процесс мог применить миграцию, пока мы ждали блокировку
      const already = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(m.version);
      if (!already) {
        db.exec(m.sql);
        db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(m.version, m.name, Date.now());
        done.push(m.version);
      }
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    }
  }
  return done;
}
