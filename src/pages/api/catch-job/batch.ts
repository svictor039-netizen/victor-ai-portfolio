import type { APIRoute } from 'astro';
import { prepareBotBatch } from '../../../lib/catch-job/service';
import { handleError, json, requireAdmin } from '../../../lib/catch-job/http';

export const prerender = false;

/** «Подготовить пакет для бота»: только фиксирует карточки, сообщений в Telegram не отправляет. */
export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;
  try {
    return json({ ok: true, ...prepareBotBatch(auth.username) });
  } catch (err) {
    return handleError(err);
  }
};
