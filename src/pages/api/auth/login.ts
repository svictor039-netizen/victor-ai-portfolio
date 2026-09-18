import type { APIRoute } from 'astro';
import { isAuthConfigured, getAdminUsername, verifyPassword, createSession, sessionCookie } from '../../../lib/auth';


export const POST: APIRoute = async ({ request }) => {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (!isAuthConfigured()) {
    return new Response(JSON.stringify({ ok: false, code: 'not_configured' }), { status: 503, headers });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, code: 'invalid_body' }), { status: 400, headers });
  }

  const username = String(body.username || '');
  const password = String(body.password || '');

  if (username !== getAdminUsername() || !verifyPassword(password)) {
    return new Response(JSON.stringify({ ok: false, code: 'invalid_credentials' }), { status: 401, headers });
  }

  const token = createSession(username);
  headers.set('Set-Cookie', sessionCookie(token));

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
