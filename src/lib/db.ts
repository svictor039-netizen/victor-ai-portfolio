/**
 * Server-side SQLite persistence for Back Office MVP.
 * Uses Node.js built-in `node:sqlite` (Node 22+).
 * Replace with PostgreSQL/Cloudflare D1 for production.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), 'data', 'victor.db');
const DB_DIR = dirname(DB_PATH);
mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT,
      contact TEXT NOT NULL,
      task TEXT NOT NULL,
      process TEXT,
      resources TEXT,
      result TEXT,
      deadline TEXT,
      source TEXT DEFAULT 'website',
      landing_page TEXT,
      referrer TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      pages_viewed TEXT,
      projects_viewed TEXT,
      services_viewed TEXT,
      cta_history TEXT,
      ai_handoff TEXT,
      qualification_status TEXT DEFAULT 'new',
      lead_score INTEGER DEFAULT 0,
      recommended_service TEXT,
      next_best_action TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      messages TEXT NOT NULL,
      handoff TEXT,
      model TEXT,
      fallback INTEGER DEFAULT 0,
      error INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      object_type TEXT,
      object_id TEXT,
      before TEXT,
      after TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS integration_status (
      name TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      configured INTEGER DEFAULT 0,
      healthy INTEGER DEFAULT 0,
      environment TEXT,
      last_check INTEGER,
      last_error TEXT,
      safe_metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS page_seo_state (
      url TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      indexed INTEGER DEFAULT 1,
      in_sitemap INTEGER DEFAULT 0,
      last_check INTEGER
    );
  `);
}

function seed() {
  const integrations = [
    { name: 'email', display_name: 'Email (Unisender)', configured: 0, healthy: 0, environment: 'CF Worker', last_check: now() },
    { name: 'turnstile', display_name: 'Cloudflare Turnstile', configured: 0, healthy: 0, environment: 'CF Worker', last_check: now() },
    { name: 'db', display_name: 'SQLite / DB', configured: 1, healthy: 1, environment: 'Node server', last_check: now() },
  ];
  const integrationStmt = db.prepare('INSERT OR IGNORE INTO integration_status (name, display_name, configured, healthy, environment, last_check) VALUES (?, ?, ?, ?, ?, ?)');
  for (const i of integrations) {
    integrationStmt.run(i.name, i.display_name, i.configured, i.healthy, i.environment, i.last_check);
  }

  const seoPages = [
    { url: '/', title: 'Victor AI — AI Consultant for Digital Transformation', indexed: 1, in_sitemap: 1, last_check: now() },
    { url: '/projects/case-study-1/', title: 'Case Study: Automation', indexed: 1, in_sitemap: 1, last_check: now() },
    { url: '/privacy/', title: 'Privacy Policy', indexed: 1, in_sitemap: 0, last_check: now() },
  ];
  const seoStmt = db.prepare('INSERT OR IGNORE INTO page_seo_state (url, title, indexed, in_sitemap, last_check) VALUES (?, ?, ?, ?, ?)');
  for (const p of seoPages) {
    seoStmt.run(p.url, p.title, p.indexed, p.in_sitemap, p.last_check);
  }
}

init();
seed();

export interface LeadRecord {
  id: string;
  kind: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  contact: string;
  task: string;
  process: string | null;
  resources: string | null;
  result: string | null;
  deadline: string | null;
  source: string;
  landing_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  pages_viewed: string | null;
  projects_viewed: string | null;
  services_viewed: string | null;
  cta_history: string | null;
  ai_handoff: string | null;
  qualification_status: string;
  score: number;
  lead_score: number;
  recommended_service: string | null;
  next_best_action: string | null;
  created_at: number;
  updated_at: number;
}

export { db };

export function cleanExpiredSessions() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
}

export function now() {
  return Math.floor(Date.now() / 1000);
}
