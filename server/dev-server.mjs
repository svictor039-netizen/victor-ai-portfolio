/**
 * Local development server that emulates Cloudflare Worker endpoints.
 * Not for production. Do not commit.
 */
import { createServer } from 'http';
import { handleRequest as handleLeadRequest } from './lead-worker.mjs';
import { handleConsultRequest } from './consult-handler.mjs';

const PORT = 8787;
const ALLOWED_ORIGINS = ['http://localhost:4321', 'http://127.0.0.1:4321'];

const env = {
  // Lead worker config
  ALLOWED_ORIGINS: ALLOWED_ORIGINS.join(','),
  RESEND_API_KEY: '',
  MAIL_FROM: '',
  TURNSTILE_SECRET_KEY: '',
  LEAD_CONSENT_CONFIRMED: 'true',

  // LLM config — local Ollama (stronger model for P2.1 acceptance)
  LLM_API_KEY: 'ollama',
  LLM_PROVIDER_URL: 'http://localhost:11434/v1/chat/completions',
  LLM_MODEL: 'qwen3-coder:30b',
  LLM_MAX_TOKENS: '800',
  LLM_TEMPERATURE: '0.5',
  LLM_TIMEOUT: '180000',
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  try { return JSON.parse(raw); } catch { return {}; }
}

// Wrap Node req/res into Web Request/Response compatible shapes
function nodeRequestToWeb(req) {
  const url = `http://localhost:${PORT}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach(val => headers.append(k, val));
    else if (v) headers.set(k, v);
  }
  return { url, headers };
}

const server = createServer(async (req, res) => {
  const { url: reqUrl, headers } = nodeRequestToWeb(req);
  const parsed = new URL(reqUrl);
  const origin = headers.get('origin') || '';

  // CORS preflight
  if (req.method === 'OPTIONS') {
    const h = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };
    res.writeHead(204, h);
    res.end();
    return;
  }

  if (parsed.pathname === '/api/consult') {
    // Build a Web Request-like object
    const body = await readBody(req);
    const request = new Request(reqUrl, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(body) : undefined,
    });
    const response = await handleConsultRequest(request, env, fetch);
    const data = await response.json();
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
    const responseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
    };
    if (corsOrigin) responseHeaders['Access-Control-Allow-Origin'] = corsOrigin;
    res.writeHead(response.status, responseHeaders);
    res.end(JSON.stringify(data));
    return;
  }

  if (parsed.pathname === '/api/leads') {
    const body = await readBody(req);
    const request = new Request(reqUrl, {
      method: req.method,
      headers,
      body: req.method === 'POST' ? JSON.stringify(body) : undefined,
    });

    // For local dev, skip Turnstile and email if keys are empty
    const devEnv = { ...env };
    if (!devEnv.RESEND_API_KEY || !devEnv.MAIL_FROM || !devEnv.TURNSTILE_SECRET_KEY) {
      // Mock response for local testing
      const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
      const responseHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Vary': 'Origin',
        'X-Content-Type-Options': 'nosniff',
      };
      if (corsOrigin) responseHeaders['Access-Control-Allow-Origin'] = corsOrigin;
      res.writeHead(200, responseHeaders);
      res.end(JSON.stringify({ ok: true, dev: true, note: 'Local dev: email delivery skipped' }));
      return;
    }

    const response = await handleLeadRequest(request, devEnv, fetch);
    const data = await response.json();
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
    const responseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
    };
    if (corsOrigin) responseHeaders['Access-Control-Allow-Origin'] = corsOrigin;
    res.writeHead(response.status, responseHeaders);
    res.end(JSON.stringify(data));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, code: 'not_found' }));
});

server.listen(PORT, () => {
  console.log(`Dev Worker emulator running at http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST http://localhost:${PORT}/api/consult`);
  console.log(`  POST http://localhost:${PORT}/api/leads`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`LLM: ${env.LLM_PROVIDER_URL} (model: ${env.LLM_MODEL})`);
});
