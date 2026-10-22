/**
 * Серверный клиент Telegram Public MCP для Catch_Job_4Me.
 * Только чтение: get_channel_info и get_latest_posts, вызов только с сервера.
 * Протокол MCP Streamable HTTP: POST JSON-RPC 2.0, ответ JSON или SSE.
 * Адрес фиксирован в коде — пользователь не может направить сервер на другой URL (SSRF).
 * Ошибки переводятся в безопасные коды: без URL, заголовков и тела ответа.
 */

// Публичный адрес учебного MCP-сервера (не секрет). Другой адрес — только правкой кода.
export const CATCH_JOB_MCP_URL = 'https://telegram-public-mcp-school.plaan-ai.workers.dev/mcp';

const PROTOCOL_VERSION = '2025-03-26';
const TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 1_000_000;
export const REQUIRED_TOOLS = ['get_channel_info', 'get_latest_posts'] as const;

export type McpErrorCode =
  | 'mcp_unreachable'
  | 'mcp_timeout'
  | 'mcp_too_large'
  | 'mcp_http_error'
  | 'mcp_format_error'
  | 'mcp_contract_changed'
  | 'mcp_tool_error'
  | 'channel_not_found';

const SAFE_MESSAGES: Record<McpErrorCode, string> = {
  mcp_unreachable: 'MCP-сервер недоступен (сетевая ошибка)',
  mcp_timeout: 'MCP-сервер не ответил за 15 секунд',
  mcp_too_large: 'Ответ MCP превысил допустимый размер',
  mcp_http_error: 'MCP-сервер вернул ошибку HTTP',
  mcp_format_error: 'MCP-сервер вернул ответ неожиданного формата',
  mcp_contract_changed: 'У MCP-сервера нет ожидаемых инструментов',
  mcp_tool_error: 'Инструмент MCP вернул ошибку',
  channel_not_found: 'Канал не найден или не является открытым',
};

export class McpError extends Error {
  code: McpErrorCode;
  httpStatus?: number;
  constructor(code: McpErrorCode, httpStatus?: number) {
    super(SAFE_MESSAGES[code] + (httpStatus ? ` (${httpStatus})` : ''));
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export interface ChannelInfo {
  channel: string;
  title: string;
  description: string;
  subscriberCount: string;
}

export interface McpPost {
  id: number;
  channel: string;
  url: string;
  text: string;
  views: string;
  timestamp: string;
}

export interface McpCallResult<T> {
  data: T;
  /** Текст ответа инструмента — сохраняется как сырой результат MCP. */
  raw: string;
  durationMs: number;
}

type FetchLike = typeof fetch;

/** Читает тело с ограничением размера, не загружая лишнее в память. */
async function readLimited(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new McpError('mcp_too_large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

/** JSON-RPC сообщение из JSON-ответа или из SSE-потока (первое событие data). */
function parseRpcBody(body: string, contentType: string): any {
  try {
    if (contentType.includes('text/event-stream')) {
      const data = body
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .find((line) => line.startsWith('{'));
      if (!data) throw new Error('no data');
      return JSON.parse(data);
    }
    return JSON.parse(body);
  } catch {
    throw new McpError('mcp_format_error');
  }
}

export class McpClient {
  private url: string;
  private fetchImpl: FetchLike;
  private sessionId: string | null = null;
  private initialized = false;
  private nextId = 1;
  calls = 0;

  constructor(opts: { url?: string; fetchImpl?: FetchLike } = {}) {
    this.url = opts.url ?? CATCH_JOB_MCP_URL;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  get host(): string {
    return new URL(this.url).host;
  }

  private async post(payload: object, expectReply: boolean): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;
    let res: Response;
    try {
      res = await this.fetchImpl(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: 'error',
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof McpError) throw err;
      throw new McpError(controller.signal.aborted ? 'mcp_timeout' : 'mcp_unreachable');
    }
    try {
      const sid = res.headers.get('mcp-session-id');
      if (sid) this.sessionId = sid;
      if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        throw new McpError('mcp_http_error', res.status);
      }
      if (!expectReply) {
        await res.body?.cancel().catch(() => {});
        return null;
      }
      const body = await readLimited(res);
      return parseRpcBody(body, res.headers.get('content-type') || '');
    } catch (err) {
      if (err instanceof McpError) throw err;
      throw new McpError(controller.signal.aborted ? 'mcp_timeout' : 'mcp_unreachable');
    } finally {
      clearTimeout(timer);
    }
  }

  private async rpc(method: string, params?: object): Promise<any> {
    this.calls += 1;
    const msg = await this.post({ jsonrpc: '2.0', id: this.nextId++, method, params }, true);
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') throw new McpError('mcp_format_error');
    if (msg.error) {
      const text = String(msg.error.message || '');
      throw new McpError(/not found/i.test(text) ? 'channel_not_found' : 'mcp_tool_error');
    }
    if (!('result' in msg)) throw new McpError('mcp_format_error');
    return msg.result;
  }

  async initialize(): Promise<{ serverName: string; serverVersion: string; protocolVersion: string }> {
    const result = await this.rpc('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'ailabstudio-catch-job', version: '1.0.0' },
    });
    if (typeof result?.protocolVersion !== 'string') throw new McpError('mcp_format_error');
    await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' }, false);
    this.initialized = true;
    return {
      serverName: String(result.serverInfo?.name ?? ''),
      serverVersion: String(result.serverInfo?.version ?? ''),
      protocolVersion: result.protocolVersion,
    };
  }

  private async ensureInit() {
    if (!this.initialized) await this.initialize();
  }

  async listTools(): Promise<string[]> {
    await this.ensureInit();
    const result = await this.rpc('tools/list');
    if (!Array.isArray(result?.tools)) throw new McpError('mcp_format_error');
    const names = result.tools.map((t: any) => String(t?.name ?? ''));
    if (!REQUIRED_TOOLS.every((n) => names.includes(n))) throw new McpError('mcp_contract_changed');
    return names;
  }

  private async callTool(name: string, args: object): Promise<{ parsed: unknown; raw: string; durationMs: number }> {
    await this.ensureInit();
    const started = Date.now();
    const result = await this.rpc('tools/call', { name, arguments: args });
    const text = result?.content?.find?.((c: any) => c?.type === 'text')?.text;
    if (typeof text !== 'string') throw new McpError('mcp_format_error');
    if (result.isError) throw new McpError(/not found/i.test(text) ? 'channel_not_found' : 'mcp_tool_error');
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new McpError('mcp_format_error');
    }
    return { parsed, raw: text, durationMs: Date.now() - started };
  }

  async getChannelInfo(channel: string): Promise<McpCallResult<ChannelInfo>> {
    const { parsed, raw, durationMs } = await this.callTool('get_channel_info', { channel });
    const p = parsed as Record<string, unknown>;
    if (!p || typeof p !== 'object' || typeof p.title !== 'string') throw new McpError('mcp_format_error');
    return {
      data: {
        channel: String(p.channel ?? channel),
        title: p.title,
        description: typeof p.description === 'string' ? p.description : '',
        subscriberCount: typeof p.subscriberCount === 'string' ? p.subscriberCount : '',
      },
      raw,
      durationMs,
    };
  }

  async getLatestPosts(channel: string, limit = 20, beforePostId?: number): Promise<McpCallResult<McpPost[]>> {
    const args = beforePostId ? { channel, limit, before_post_id: beforePostId } : { channel, limit };
    const { parsed, raw, durationMs } = await this.callTool('get_latest_posts', args);
    if (!Array.isArray(parsed)) throw new McpError('mcp_format_error');
    const posts = parsed.map((p: any): McpPost => {
      const ok =
        p && Number.isInteger(p.id) && p.id > 0 && typeof p.url === 'string' &&
        typeof p.timestamp === 'string' && !Number.isNaN(Date.parse(p.timestamp));
      if (!ok) throw new McpError('mcp_format_error');
      return {
        id: p.id,
        channel: String(p.channel ?? channel),
        url: p.url,
        text: typeof p.text === 'string' ? p.text : '',
        views: typeof p.views === 'string' ? p.views : String(p.views ?? ''),
        timestamp: new Date(p.timestamp).toISOString(),
      };
    });
    return { data: posts, raw, durationMs };
  }
}

export function safeError(err: unknown): { code: string; message: string } {
  if (err instanceof McpError) return { code: err.code, message: err.message };
  return { code: 'internal_error', message: 'Внутренняя ошибка при обращении к MCP' };
}
