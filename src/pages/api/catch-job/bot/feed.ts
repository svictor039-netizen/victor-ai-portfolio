import type { APIRoute } from 'astro';
import { getBotBatch } from '../../../../lib/catch-job/service';
import { isTopicCode } from '../../../../lib/catch-job/topics';
import { handleError, json, requireBot } from '../../../../lib/catch-job/http';

export const prerender = false;

/** Для бота: краткие карточки последнего пакета только по тематикам пользователя (?topics=sites,bots). */
export const GET: APIRoute = async ({ request }) => {
  const auth = requireBot(request);
  if (auth instanceof Response) return auth;
  try {
    const topics = (new URL(request.url).searchParams.get('topics') || '').split(',').map((t) => t.trim()).filter(Boolean);
    if (topics.length === 0 || !topics.every(isTopicCode)) return json({ ok: false, code: 'invalid_topics' }, 400);
    const batch = getBotBatch(undefined, topics);
    if (!batch) return json({ ok: false, code: 'no_batch' }, 404);
    return json({ ok: true, ...batch });
  } catch (err) {
    return handleError(err);
  }
};
