import type { APIRoute } from 'astro';
import { getSessionToken, validateSession } from '../../../lib/auth';


export const GET: APIRoute = async ({ request }) => {
  const token = getSessionToken(request);
  const session = token ? validateSession(token) : null;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (!session) {
    return new Response(JSON.stringify({ ok: false, code: 'unauthorized' }), { status: 401, headers });
  }

  return new Response(JSON.stringify({ ok: true, username: session.username }), { status: 200, headers });
};
