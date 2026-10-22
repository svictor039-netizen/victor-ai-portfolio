/**
 * Общие проверки для /api/catch-job/*: админ-сессия (существующая авторизация Back Office)
 * и сервисный токен бота CATCH_JOB_BOT_API_TOKEN. Токен не логируется и не возвращается.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { getSessionToken, validateSession } from '../auth';
import { CatchJobError } from './service';

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/** Админ: действующая сессия; для изменяющих запросов — JSON и Origin своего сайта. */
export function requireAdmin(request: Request): { username: string } | Response {
  const token = getSessionToken(request);
  const session = token ? validateSession(token) : null;
  if (!session) return json({ ok: false, code: 'unauthorized' }, 401);
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin) return json({ ok: false, code: 'bad_origin' }, 403);
    if (!(request.headers.get('content-type') || '').includes('application/json')) return json({ ok: false, code: 'json_required' }, 415);
  }
  return session;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Бот: Authorization: Bearer <CATCH_JOB_BOT_API_TOKEN>, сравнение за постоянное время. */
export function requireBot(request: Request): true | Response {
  const expected = process.env.CATCH_JOB_BOT_API_TOKEN || '';
  if (expected.length < 32) return json({ ok: false, code: 'bot_api_not_configured' }, 503);
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(\S+)$/);
  if (!match || !timingSafeEqual(digest(match[1]), digest(expected))) return json({ ok: false, code: 'unauthorized' }, 401);
  return true;
}

export async function readJson(request: Request): Promise<any> {
  const text = await request.text();
  if (text.length > 64_000) throw new CatchJobError('body_too_large', 'Слишком большой запрос', 413);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new CatchJobError('invalid_json', 'Некорректный JSON');
  }
}

export function handleError(err: unknown): Response {
  if (err instanceof CatchJobError) return json({ ok: false, code: err.code, message: err.message }, err.status);
  console.error('[catch-job] internal error', (err as Error)?.name);
  return json({ ok: false, code: 'internal_error', message: 'Внутренняя ошибка' }, 500);
}
