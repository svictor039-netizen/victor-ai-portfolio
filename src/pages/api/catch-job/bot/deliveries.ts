import type { APIRoute } from 'astro';
import { recordDeliveries } from '../../../../lib/catch-job/service';
import { handleError, json, readJson, requireBot } from '../../../../lib/catch-job/http';

export const prerender = false;

/**
 * Для бота: какие карточки каким пользователям доставлены (mode: dry_run | sent).
 * user_ref — внутренний id пользователя в боте; Telegram ID сайт не хранит. Повтор идемпотентен.
 */
export const POST: APIRoute = async ({ request }) => {
  const auth = requireBot(request);
  if (auth instanceof Response) return auth;
  try {
    return json({ ok: true, ...recordDeliveries(await readJson(request)) });
  } catch (err) {
    return handleError(err);
  }
};
