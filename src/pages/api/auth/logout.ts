import type { APIRoute } from 'astro';
import { getSessionToken, deleteSession, clearSessionCookie } from '../../../lib/auth';


export const POST: APIRoute = async ({ request }) => {
  const token = getSessionToken(request);
  if (token) deleteSession(token);

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Set-Cookie', clearSessionCookie());
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
