import type { APIRoute } from 'astro';
import { getBotBatch } from '../../../../lib/catch-job/service';
import { handleError, json, requireBot } from '../../../../lib/catch-job/http';

export const prerender = false;

/** Для бота: последний подготовленный вручную пакет кратких карточек (или ?batch_id=). */
export const GET: APIRoute = async ({ request }) => {
  const auth = requireBot(request);
  if (auth instanceof Response) return auth;
  try {
    const raw = new URL(request.url).searchParams.get('batch_id');
    const batchId = raw === null ? undefined : Number(raw);
    if (batchId !== undefined && !Number.isInteger(batchId)) return json({ ok: false, code: 'invalid_batch' }, 400);
    const batch = getBotBatch(batchId);
    if (!batch) return json({ ok: false, code: 'no_batch' }, 404);
    return json({ ok: true, ...batch });
  } catch (err) {
    return handleError(err);
  }
};
