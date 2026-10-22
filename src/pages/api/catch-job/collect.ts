import type { APIRoute } from 'astro';
import { collectSource, finishCollect, startCollect } from '../../../lib/catch-job/service';
import { handleError, json, readJson, requireAdmin } from '../../../lib/catch-job/http';

export const prerender = false;

/**
 * «Проверить каналы» — ручной запуск по шагам, чтобы показать прогресс по каждому каналу:
 * { action: 'start' } → { action: 'source', runId, handle } для каждого канала → { action: 'finish', runId }.
 * Второй запуск во время выполнения отклоняется (409).
 */
export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;
  try {
    const body = await readJson(request);
    if (body.action === 'start') return json({ ok: true, ...startCollect(auth.username) });
    if (body.action === 'source') return json({ ok: true, result: await collectSource(body.runId, body.handle) });
    if (body.action === 'finish') return json({ ok: true, ...finishCollect(body.runId) });
    return json({ ok: false, code: 'invalid_action' }, 400);
  } catch (err) {
    return handleError(err);
  }
};
