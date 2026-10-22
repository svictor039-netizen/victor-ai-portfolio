import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Loader2, ExternalLink, Send, RefreshCw, PlugZap, ShieldAlert } from 'lucide-react';

type Tone = 'ok' | 'warn' | 'error' | 'muted';

interface SourceState {
  handle: string; title: string | null; subscriberCount: string | null; enabled: boolean; note: string;
  status: string; lastCheckedAt: number | null; lastPostAt: number | null; lastError: string | null;
}
interface RunSource {
  handle: string; status: string; calls: number; postsRead: number; postsNew: number; itemsNew: number;
  lastPostAt: number | null; windowCovered: boolean; durationMs: number; diagnostic: string;
}
interface PostItem { item_key: string; title: string; topic: string; tags: string[] }
interface Post { id: number; post_id: number; url: string; text: string; views: string; posted_at: number; items: PostItem[] }
interface PickRow {
  handle: string; sourceEnabled: boolean; topic: string; computedAt: number;
  item: { itemKey: string; title: string; postedAt: number; postUrl: string; excluded: boolean; comment: string } | null;
}
interface State {
  now: number; windowHours: number;
  mcp: { url: string; state: string; checkedAt: number | null; lastOkAt: number | null; server?: string; protocol?: string; tools?: string[]; error: { code: string; message: string } | null };
  sources: SourceState[];
  topics: { selected: string[]; all: { code: string; label: string }[] };
  lastRun: { id: number; status: string; startedAt: number; finishedAt: number | null } | null;
  runSources: RunSource[];
  posts: Record<string, Post[]>;
  picks: PickRow[];
  batch: BatchInfo | null;
  batches: BatchInfo[];
}
interface BatchInfo {
  id: number; status: 'actual' | 'stale'; cardsCount: number; createdAt: number; staleAt: number | null;
  deliveries: { mode: string; n: number }[];
}

function deliveriesText(d: BatchInfo['deliveries']) {
  return d.length === 0 ? 'нет' : d.map((x) => `${x.mode === 'dry_run' ? 'сухой прогон' : 'отправлено'} — ${x.n}`).join(', ');
}

const TONE_CLASS: Record<Tone, string> = {
  ok: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  muted: 'bg-raised text-muted-foreground border-border',
};

const SOURCE_STATUS: Record<string, [string, Tone]> = {
  active: ['Работает, есть свежие посты', 'ok'],
  no_new_posts: ['Нет постов за 72 ч', 'warn'],
  inactive: ['Нет постов больше 7 дней', 'warn'],
  no_posts: ['Нет данных', 'warn'],
  not_checked: ['Не проверен', 'muted'],
  error: ['Ошибка', 'error'],
  disabled: ['Выключен', 'muted'],
};

const MCP_STATUS: Record<string, [string, Tone]> = {
  connected: ['Подключён', 'ok'],
  error: ['Ошибка подключения', 'error'],
  not_checked: ['Не проверен', 'warn'],
};

function fmt(ts: number | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  const Icon = tone === 'ok' ? CheckCircle : tone === 'error' ? XCircle : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {tone !== 'muted' && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl p-4 sm:p-5 min-w-0" aria-labelledby={`cj-step-${step}`}>
      <div className="mb-4">
        {/* Глобальные h2/h3 публичного сайта не в слое Tailwind — размер задаём с ! */}
        <h2 id={`cj-step-${step}`} className="text-base! leading-snug! tracking-normal! font-semibold flex items-center gap-2">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs">{step}</span>
          {title}
        </h2>
        {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch {}
  if (!res.ok && !data) data = { ok: false, message: `Ошибка ${res.status}` };
  return data ?? { ok: false };
}

const btn = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
const btnSecondary = `${btn} border border-border bg-raised hover:bg-raised/70`;
const input = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary';

type Progress = Record<string, { state: 'waiting' | 'running' | 'done' | 'error'; text: string }>;

export function CatchJobPanel() {
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<'' | 'mcp' | 'collect' | 'batch'>('');
  const [progress, setProgress] = useState<Progress>({});
  const [message, setMessage] = useState<{ tone: Tone; text: string } | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const data = await api('/api/catch-job/state/');
    if (!data.ok) { setLoadError(data.message || 'Не удалось загрузить состояние'); return; }
    setLoadError('');
    setState(data.state);
    setNotes(Object.fromEntries(data.state.sources.map((s: SourceState) => [s.handle, s.note])));
    setComments(Object.fromEntries(data.state.picks.filter((p: PickRow) => p.item).map((p: PickRow) => [p.item!.itemKey, p.item!.comment])));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patch(body: object, okText?: string) {
    const data = await api('/api/catch-job/settings/', 'PATCH', body);
    setMessage(data.ok ? (okText ? { tone: 'ok', text: okText } : null) : { tone: 'error', text: data.message || 'Не удалось сохранить' });
    await load();
  }

  async function checkMcp() {
    setBusy('mcp'); setMessage(null);
    const data = await api('/api/catch-job/mcp-check/', 'POST', {});
    setBusy('');
    setMessage(data.ok ? { tone: 'ok', text: 'Соединение с MCP работает' } : { tone: 'error', text: data.mcp?.error?.message || data.message || 'Ошибка подключения' });
    await load();
  }

  async function collect() {
    setBusy('collect'); setMessage(null);
    const start = await api('/api/catch-job/collect/', 'POST', { action: 'start' });
    if (!start.ok) { setBusy(''); setMessage({ tone: 'error', text: start.message || 'Не удалось начать проверку' }); return; }
    const initial: Progress = {};
    for (const h of start.sources) initial[h] = { state: 'waiting', text: 'Ожидает' };
    setProgress(initial);
    for (const handle of start.sources as string[]) {
      setProgress((p) => ({ ...p, [handle]: { state: 'running', text: 'Читаю через MCP…' } }));
      const r = await api('/api/catch-job/collect/', 'POST', { action: 'source', runId: start.runId, handle });
      const failed = !r.ok || r.result?.status === 'error';
      setProgress((p) => ({ ...p, [handle]: { state: failed ? 'error' : 'done', text: r.result?.diagnostic || r.message || 'Ошибка' } }));
    }
    const fin = await api('/api/catch-job/collect/', 'POST', { action: 'finish', runId: start.runId });
    setBusy('');
    const statusText: Record<string, [string, Tone]> = { ok: ['Проверка завершена', 'ok'], partial: ['Проверка завершена частично: один канал с ошибкой', 'warn'], failed: ['Проверка не удалась', 'error'] };
    const [text, tone] = statusText[fin.status] ?? [fin.message || 'Проверка завершена', 'warn'];
    setMessage({ tone, text });
    await load();
  }

  async function prepareBatch() {
    setBusy('batch'); setMessage(null);
    const data = await api('/api/catch-job/batch/', 'POST', {});
    setBusy('');
    const replaced = data.replacedBatchId ? ` Пакет №${data.replacedBatchId} остался в истории как устаревший.` : '';
    setMessage(data.ok
      ? { tone: 'ok', text: data.created ? `Пакет №${data.batchId} подготовлен: ${data.cardsCount} карточек.${replaced} Сообщения не отправлялись.` : `Подборка не менялась — актуален пакет №${data.batchId}.` }
      : { tone: 'error', text: data.message || 'Не удалось подготовить пакет' });
    await load();
  }

  if (loadError) return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm" role="alert">{loadError}</div>;
  if (!state) return <div className="text-muted-foreground">Загрузка…</div>;

  const topicLabel = Object.fromEntries(state.topics.all.map((t) => [t.code, t.label]));
  const [mcpText, mcpTone] = MCP_STATUS[state.mcp.state] ?? MCP_STATUS.not_checked;
  const runByHandle = Object.fromEntries(state.runSources.map((r) => [r.handle, r]));
  const selectedPicks = state.picks.filter((p) => state.topics.selected.includes(p.topic) && p.sourceEnabled);
  const anyEnabled = state.sources.some((s) => s.enabled);
  const batchStale = state.batch?.status === 'stale';

  return (
    <div className="space-y-5 min-w-0">
      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${TONE_CLASS[message.tone]}`} role="status">{message.text}</div>
      )}

      <Section step={1} title="MCP-сервер" hint="Источник чтения — только Telegram Public MCP. Адрес фиксирован на сервере и не редактируется.">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
          <dl className="grid gap-2 text-sm min-w-0">
            <div className="min-w-0"><dt className="text-muted-foreground">URL сервера</dt><dd className="font-mono text-xs break-all">{state.mcp.url}</dd></div>
            <div><dt className="text-muted-foreground">Статус</dt><dd className="mt-0.5"><Badge tone={mcpTone}>{mcpText}</Badge></dd></div>
            <div><dt className="text-muted-foreground">Последняя успешная проверка</dt><dd>{fmt(state.mcp.lastOkAt)}</dd></div>
            {state.mcp.state === 'connected' && state.mcp.tools && (
              <div className="min-w-0"><dt className="text-muted-foreground">Сервер и инструменты</dt><dd className="break-words">{state.mcp.server} · протокол {state.mcp.protocol} · {state.mcp.tools.join(', ')}</dd></div>
            )}
            {state.mcp.state === 'error' && state.mcp.error && (
              <div><dt className="text-muted-foreground">Ошибка</dt><dd className="text-rose-300">{state.mcp.error.message} [{state.mcp.error.code}]</dd></div>
            )}
          </dl>
          <button type="button" className={btnPrimary} onClick={checkMcp} disabled={!!busy}>
            {busy === 'mcp' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <PlugZap size={16} aria-hidden="true" />}
            Проверить подключение
          </button>
        </div>
      </Section>

      <Section step={2} title="Источники" hint="Два фиксированных открытых канала. Username не меняется; можно включить/выключить канал и оставить внутреннее примечание.">
        <div className="grid gap-4 md:grid-cols-2">
          {state.sources.map((s) => {
            const [text, tone] = SOURCE_STATUS[s.status] ?? SOURCE_STATUS.not_checked;
            return (
              <article key={s.handle} className="rounded-lg border border-border bg-background/40 p-4 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base! tracking-normal! font-medium break-words">{s.title || 'Название появится после проверки'}</h3>
                    <a className="text-sm text-primary hover:underline" href={`https://t.me/${s.handle}`} target="_blank" rel="noopener noreferrer">@{s.handle}</a>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={s.enabled} disabled={!!busy}
                      onChange={(e) => patch({ kind: 'source', handle: s.handle, enabled: e.target.checked })} />
                    {s.enabled ? 'Включён' : 'Выключен'}
                  </label>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2"><dt className="sr-only">Статус</dt><dd><Badge tone={tone}>{text}</Badge></dd></div>
                  <div><dt className="text-muted-foreground">Последняя проверка</dt><dd>{fmt(s.lastCheckedAt)}</dd></div>
                  <div><dt className="text-muted-foreground">Последний пост</dt><dd>{fmt(s.lastPostAt)}</dd></div>
                  {s.subscriberCount && <div><dt className="text-muted-foreground">Подписчики</dt><dd>{s.subscriberCount}</dd></div>}
                  {s.lastError && <div className="sm:col-span-2"><dt className="text-muted-foreground">Ошибка</dt><dd className="text-rose-300 break-words">{s.lastError}</dd></div>}
                </dl>
                <label className="mt-3 block text-sm">
                  <span className="text-muted-foreground">Внутреннее примечание</span>
                  <textarea className={`${input} mt-1`} rows={2} maxLength={1000} value={notes[s.handle] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [s.handle]: e.target.value }))} />
                </label>
                <button type="button" className={`${btnSecondary} mt-2`} disabled={!!busy || (notes[s.handle] ?? '') === s.note}
                  onClick={() => patch({ kind: 'source', handle: s.handle, note: notes[s.handle] ?? '' }, 'Примечание сохранено')}>
                  Сохранить примечание
                </button>
              </article>
            );
          })}
        </div>
      </Section>

      <Section step={3} title="Тематики" hint="Сохраняются для следующего ручного запуска. Один заказ получает одну основную тематику.">
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
          <legend className="sr-only">Тематики подборки</legend>
          {state.topics.all.map((t) => (
            <label key={t.code} className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={state.topics.selected.includes(t.code)} disabled={!!busy}
                onChange={(e) => patch({ kind: 'topics', topics: e.target.checked ? [...state.topics.selected, t.code] : state.topics.selected.filter((c) => c !== t.code) })} />
              {t.label}
            </label>
          ))}
        </fieldset>
      </Section>

      <Section step={4} title="Проверить каналы" hint="Ручной запуск: сервер сайта читает включённые каналы через MCP. Повторная проверка не создаёт дубликатов.">
        <button type="button" className={btnPrimary} onClick={collect} disabled={!!busy || !anyEnabled}>
          {busy === 'collect' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} aria-hidden="true" />}
          {busy === 'collect' ? 'Проверяю…' : 'Проверить каналы'}
        </button>
        {!anyEnabled && <p className="mt-2 text-sm text-amber-300">Все источники выключены.</p>}
        {Object.keys(progress).length > 0 && (
          <ul className="mt-4 space-y-2" aria-live="polite">
            {Object.entries(progress).map(([h, p]) => (
              <li key={h} className="flex items-start gap-2 text-sm">
                {p.state === 'running' ? <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-primary" aria-hidden="true" />
                  : p.state === 'done' ? <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  : p.state === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" aria-hidden="true" />
                  : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />}
                <span className="min-w-0 break-words"><b>@{h}</b> — {p.text}</span>
              </li>
            ))}
          </ul>
        )}
        {state.lastRun && (
          <p className="mt-3 text-xs text-muted-foreground">Последний запуск №{state.lastRun.id}: {fmt(state.lastRun.startedAt)}, статус {state.lastRun.status}</p>
        )}
      </Section>

      <Section step={5} title="Ответы MCP и найденные посты" hint="Рабочий закрытый экран: полный текст поста виден только здесь.">
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          <div className="flex items-start gap-2">
            <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
            <div className="min-w-0">
              <b>Никогда не попадёт в бот:</b> полный текст поста, контакты и ник заказчика («Покупатель»), бюджет, вложения и изображения, просмотры, служебный ответ MCP, комментарии администратора.
              <br /><b>В бот уходит только:</b> тематика, краткий заголовок, дата публикации, канал-источник, ссылка на исходный пост.
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {state.sources.map((s) => {
            const r: RunSource | undefined = runByHandle[s.handle];
            const [text, tone] = r ? (SOURCE_STATUS[r.status] ?? SOURCE_STATUS.not_checked) : SOURCE_STATUS.not_checked;
            const posts = state.posts[s.handle] ?? [];
            return (
              <article key={s.handle} className="rounded-lg border border-border p-4 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base! tracking-normal! font-medium">@{s.handle}</h3>
                  <Badge tone={tone}>{r ? text : 'Не проверялся'}</Badge>
                </div>
                {r ? (
                  <dl className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
                    <div className="col-span-2 min-w-0"><dt className="text-muted-foreground">Канал</dt><dd className="break-words">{s.title || '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Последний пост</dt><dd>{fmt(r.lastPostAt)}</dd></div>
                    <div><dt className="text-muted-foreground">Прочитано постов</dt><dd>{r.postsRead}</dd></div>
                    <div><dt className="text-muted-foreground">Время проверки</dt><dd>{fmt(s.lastCheckedAt)}</dd></div>
                    <div><dt className="text-muted-foreground">Вызовов MCP</dt><dd>{r.calls} · {(r.durationMs / 1000).toFixed(1)} с</dd></div>
                    <div className="col-span-2 min-w-0"><dt className="text-muted-foreground">Результат MCP</dt><dd className="break-words">{r.diagnostic}</dd></div>
                  </dl>
                ) : <p className="mt-3 text-sm text-muted-foreground">Нажмите «Проверить каналы».</p>}
                {posts.length > 0 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-primary">Посты ({posts.length} последних)</summary>
                    <ul className="mt-2 space-y-3">
                      {posts.map((p) => (
                        <li key={p.id} className="rounded-md border border-border bg-background/40 p-3 text-sm min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <a className="text-primary hover:underline" href={p.url} target="_blank" rel="noopener noreferrer">Пост №{p.post_id}</a>
                            <span>{fmt(p.posted_at)}</span>
                            <span>{p.views} просмотров</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-foreground/90">{p.text || '(пустой текст)'}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.items.length === 0
                              ? <span className="text-xs text-muted-foreground">Заказов в посте нет</span>
                              : p.items.map((i) => (
                                <span key={i.item_key} className={`rounded px-1.5 py-0.5 text-xs ${i.topic === 'unclassified' ? 'bg-raised text-muted-foreground' : 'bg-primary/15 text-primary'}`}>
                                  {topicLabel[i.topic] ?? 'Тематика не определена'}: {i.title}
                                </span>
                              ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      </Section>

      <Section step={6} title="Итог ручной подборки" hint={`Правило: 1 самый свежий заказ × 1 тематика × 1 канал, окно свежести ${state.windowHours} ч. Исключение и комментарий — ручные действия администратора.`}>
        {selectedPicks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет выбранных тематик или включённых каналов.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {selectedPicks.map((p) => {
              const label = topicLabel[p.topic];
              if (!p.item) {
                return (
                  <li key={`${p.handle}-${p.topic}`} className="rounded-lg border border-dashed border-border p-3 text-sm min-w-0">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>@{p.handle}</span><span>·</span><span>{label}</span></div>
                    <p className="mt-1.5 text-muted-foreground">По теме «{label}» в @{p.handle} подходящих свежих постов не найдено.</p>
                  </li>
                );
              }
              const it = p.item;
              return (
                <li key={`${p.handle}-${p.topic}`} className={`rounded-lg border p-3 text-sm min-w-0 ${it.excluded ? 'border-border opacity-70' : 'border-primary/30'}`}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>@{p.handle}</span><span>·</span><span>{label}</span><span>·</span><span>{fmt(it.postedAt)}</span>
                  </div>
                  <p className="mt-1.5 font-medium break-words">{it.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="ok">Классифицировано</Badge>
                    <Badge tone={it.excluded ? 'warn' : 'ok'}>{it.excluded ? 'Исключён вручную' : 'Включён в отправку'}</Badge>
                    <a className="inline-flex items-center gap-1 text-primary hover:underline" href={it.postUrl} target="_blank" rel="noopener noreferrer">
                      Открыть исходный пост <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </div>
                  <label className="mt-2 block">
                    <span className="text-muted-foreground text-xs">Внутренний комментарий (в бот не передаётся)</span>
                    <input className={`${input} mt-1`} maxLength={1000} value={comments[it.itemKey] ?? ''}
                      onChange={(e) => setComments((c) => ({ ...c, [it.itemKey]: e.target.value }))} />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={btnSecondary} disabled={!!busy || (comments[it.itemKey] ?? '') === it.comment}
                      onClick={() => patch({ kind: 'item', itemKey: it.itemKey, comment: comments[it.itemKey] ?? '' }, 'Комментарий сохранён')}>
                      Сохранить комментарий
                    </button>
                    <button type="button" className={btnSecondary} disabled={!!busy}
                      onClick={() => patch({ kind: 'item', itemKey: it.itemKey, excluded: !it.excluded })}>
                      {it.excluded ? 'Вернуть в отправку' : 'Исключить'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section step={7} title="Пакет для @catch_job_4me_bot" hint="Кнопка только фиксирует краткие карточки для бота. Сайт не отправляет сообщения в Telegram; бот забирает пакет сам по закрытому API.">
        {batchStale && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" role="status">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Подборка изменилась. Обновите пакет для бота. Пакет №{state.batch!.id} устарел — бот его больше не получает.</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btnPrimary} onClick={prepareBatch} disabled={!!busy}>
            {busy === 'batch' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            {batchStale ? 'Обновить пакет для бота' : 'Подготовить пакет для бота'}
          </button>
          {state.batch ? (
            <span className="text-sm text-muted-foreground">
              Пакет №{state.batch.id}: {state.batch.cardsCount} карточек, {fmt(state.batch.createdAt)} —{' '}
              {batchStale ? <Badge tone="warn">устарел</Badge> : <Badge tone="ok">актуален, доступен боту</Badge>}
            </span>
          ) : <span className="text-sm text-muted-foreground">Пакетов ещё нет.</span>}
        </div>
        {state.batches.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-primary">История пакетов ({state.batches.length})</summary>
            <ul className="mt-2 space-y-1.5 text-sm">
              {state.batches.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border px-3 py-2">
                  <span className="font-medium">№{b.id}</span>
                  {b.status === 'stale' ? <Badge tone="warn">устарел</Badge> : <Badge tone="ok">актуален</Badge>}
                  <span className="text-muted-foreground">{b.cardsCount} карточек · создан {fmt(b.createdAt)}{b.staleAt ? ` · устарел ${fmt(b.staleAt)}` : ''}</span>
                  <span className="text-muted-foreground">Отчёты бота: {deliveriesText(b.deliveries)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>
    </div>
  );
}
