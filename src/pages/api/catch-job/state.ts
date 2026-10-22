import type { APIRoute } from 'astro';
import { getAdminState } from '../../../lib/catch-job/service';
import { handleError, json, requireAdmin } from '../../../lib/catch-job/http';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;
  try {
    return json({ ok: true, state: getAdminState() });
  } catch (err) {
    return handleError(err);
  }
};
