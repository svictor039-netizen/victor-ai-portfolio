/**
 * Server-side auth for Back Office.
 * Credentials live in server env only.
 * Password hash: Node crypto.scrypt with random salt.
 * Sessions stored in SQLite with HttpOnly cookies.
 */
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import { db, cleanExpiredSessions } from './db';

const SESSION_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function getEnvCreds() {
  const username = process.env.ADMIN_USERNAME || '';
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  return { username, hash };
}

export function isAuthConfigured(): boolean {
  const { username, hash } = getEnvCreds();
  return !!(username && hash);
}

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

/**
 * Hash password with scrypt and random 32-byte salt.
 * Returns "salt:hash" hex string.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(32);
  const hash = scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  return salt.toString('hex') + ':' + hash.toString('hex');
}

/**
 * Verify password against stored "salt:hash" using timing-safe compare.
 */
export function verifyPassword(password: string): boolean {
  const { hash } = getEnvCreds();
  if (!hash) return false;
  const parts = hash.split(':');
  if (parts.length !== 2) return false;
  const [saltHex, expectedHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (salt.length !== 32 || expected.length !== 64) return false;
  const derived = scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  try {
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function getAdminUsername(): string {
  return getEnvCreds().username;
}

export function createSession(username: string): string {
  cleanExpiredSessions();
  const token = generateToken();
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.prepare(
    'INSERT INTO sessions (id, username, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(token, username, createdAt, expiresAt);
  return token;
}

export function validateSession(token: string): { username: string } | null {
  cleanExpiredSessions();
  const row = db.prepare(
    'SELECT username FROM sessions WHERE id = ? AND expires_at > ?'
  ).get(token, Date.now()) as { username: string } | undefined;
  return row || null;
}

export function deleteSession(token: string) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(token);
}

export function sessionCookie(token: string): string {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `victor_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}

export function clearSessionCookie(): string {
  return `victor_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`;
}

export function getSessionToken(request: Request): string | undefined {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/victor_session=([^;]+)/);
  return match?.[1];
}
