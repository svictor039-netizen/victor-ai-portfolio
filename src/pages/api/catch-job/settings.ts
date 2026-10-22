import type { APIRoute } from 'astro';
import { setSelectedTopics, updateItemFlags, updateSource } from '../../../lib/catch-job/service';
import { handleError, json, readJson, requireAdmin } from '../../../lib/catch-job/http';

export const prerender = false;

/**
 * Ручные изменения администратора:
 * source — включение и внутреннее примечание; topics — пять фиксированных тематик;
 * item — исключение из отправки и внутренний комментарий.
 */
export const PATCH: APIRoute = async ({ request }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await readJson(request);
    if (body.kind === 'source') {
      updateSource(body.handle, { enabled: body.enabled, note: body.note }, auth.username);
    } else if (body.kind === 'topics') {
      setSelectedTopics(body.topics, auth.username);
    } else if (body.kind === 'item') {
      updateItemFlags(body.itemKey, { excluded: body.excluded, comment: body.comment }, auth.username);
    } else {
      return json({ ok: false, code: 'invalid_kind' }, 400);
    }
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
};
