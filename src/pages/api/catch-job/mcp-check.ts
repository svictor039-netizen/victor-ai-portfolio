import type { APIRoute } from 'astro';
import { checkMcp } from '../../../lib/catch-job/service';
import { handleError, json, requireAdmin } from '../../../lib/catch-job/http';

export const prerender = false;

/** «Проверить подключение»: initialize + tools/list к фиксированному MCP-адресу. */
export const POST: APIRoute = async ({ request }) => {
  const auth = requireAdmin(request);
  if (auth instanceof Response) return auth;
  try {
    const mcp = await checkMcp(auth.username);
    return json({ ok: mcp.state === 'connected', mcp });
  } catch (err) {
    return handleError(err);
  }
};
