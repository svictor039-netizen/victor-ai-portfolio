import { track, type SiteEventName } from './events';
import { getLeadContextForForm } from './session';

const STORAGE_KEY = 'victor_ai_chat';
const MAX_HISTORY = 40;
const MAX_MSG_LENGTH = 1000;

type ChatMessage = { role: 'user' | 'assistant'; content: string; ts: number };

interface AiHandoff {
  task?: string;
  desired_outcome?: string;
  urgency?: string;
  interest_area?: string;
  recommended_service?: string;
  relevant_projects?: string[];
  conversation_summary?: string;
}

let sessionHistory: ChatMessage[] = [];
let isOpen = false;
let isLoading = false;

function getEndpoint() {
  const el = document.querySelector<HTMLElement>('[data-ai-endpoint]');
  return el?.dataset.aiEndpoint || '';
}

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) return parsed.slice(-MAX_HISTORY);
    }
  } catch {}
  return [];
}

function saveHistory() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionHistory.slice(-MAX_HISTORY)));
  } catch {}
}

function sanitizeInput(text: string): string {
  return text.replace(/[<>]/g, '').slice(0, MAX_MSG_LENGTH).trim();
}

function renderMessages(container: HTMLElement) {
  container.innerHTML = '';
  for (const msg of sessionHistory) {
    const div = document.createElement('div');
    div.className = 'ai-consultant-msg ai-consultant-msg--' + (msg.role === 'user' ? 'user' : 'bot');
    div.textContent = msg.content;
    container.appendChild(div);
  }
  container.scrollTop = container.scrollHeight;
}

function showTyping(container: HTMLElement) {
  const div = document.createElement('div');
  div.className = 'ai-consultant-typing';
  div.textContent = 'Думает';
  div.id = 'ai-typing';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTyping(_container?: HTMLElement) {
  const el = document.getElementById('ai-typing');
  if (el) el.remove();
}

function showError(panel: HTMLElement, message: string) {
  const existing = panel.querySelector('.ai-consultant-error');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = 'ai-consultant-error';
  div.textContent = message;
  panel.appendChild(div);
  setTimeout(() => div.remove(), 8000);
}

function setHandoff(handoff: AiHandoff) {
  try {
    sessionStorage.setItem('victor_ai_handoff', JSON.stringify(handoff));
  } catch {}
}

async function saveConversationToStore(handoff?: AiHandoff) {
  try {
    const { saveConversation } = await import('./admin-store');
    const sid = sessionStorage.getItem('victor_session_id') || crypto.randomUUID();
    saveConversation({
      id: crypto.randomUUID(),
      sessionId: sid,
      messages: sessionHistory.map((m) => ({ role: m.role, content: m.content, timestamp: m.ts })),
      handoff: handoff || undefined,
      createdAt: new Date().toISOString(),
    });
  } catch {}
}

function clearHandoff() {
  try { sessionStorage.removeItem('victor_ai_handoff'); } catch {}
}

function getSessionContext() {
  try {
    const ctx = getLeadContextForForm();
    return {
      pages_viewed: ctx.pages_viewed,
      projects_viewed: ctx.projects_viewed,
      services_viewed: ctx.services_viewed,
      landing_page: ctx.landing_page,
      referrer: ctx.referrer,
      utm: ctx.utm,
    };
  } catch {
    return undefined;
  }
}

export function initAiConsultant() {
  const bubble = document.querySelector<HTMLButtonElement>('[data-ai-bubble]');
  const panel = document.querySelector<HTMLElement>('[data-ai-panel]');
  const closeBtn = document.querySelector<HTMLButtonElement>('[data-ai-close]');
  const input = document.querySelector<HTMLTextAreaElement>('[data-ai-input]');
  const sendBtn = document.querySelector<HTMLButtonElement>('[data-ai-send]');
  const messagesArea = document.querySelector<HTMLElement>('[data-ai-messages]');
  const clearBtn = document.querySelector<HTMLButtonElement>('[data-ai-clear]');
  const handoffBtn = document.querySelector<HTMLButtonElement>('[data-ai-handoff]');
  const endpoint = getEndpoint();

  if (!bubble || !panel || !messagesArea) return;

  const elPanel = panel;
  const elMessages = messagesArea;

  sessionHistory = loadHistory();

  function togglePanel(open: boolean) {
    isOpen = open;
    elPanel.hidden = !open;
    if (bubble) bubble.setAttribute('aria-expanded', String(open));
    if (open) {
      track('ai_consultant_open' as SiteEventName);
      renderMessages(elMessages);
      input?.focus();
    }
  }

  bubble.addEventListener('click', () => togglePanel(!isOpen));
  closeBtn?.addEventListener('click', () => togglePanel(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) togglePanel(false);
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = panel.querySelectorAll<HTMLElement>('button, textarea, [href]');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  async function sendMessage() {
    if (!input || isLoading) return;
    if (!endpoint) {
      showFallback(elPanel);
      return;
    }
    const text = sanitizeInput(input.value);
    if (!text) return;

    input.value = '';
    sessionHistory.push({ role: 'user', content: text, ts: Date.now() });
    saveHistory();
    renderMessages(elMessages);
    isLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    showTyping(elMessages);

    track('ai_consultant_message' as SiteEventName, { length: text.length });

    try {
      const body: Record<string, unknown> = {
        message: text,
        history: sessionHistory.slice(-20).map(({ role, content }) => ({ role, content })),
        intent: 'chat',
      };
      const ctx = getSessionContext();
      if (ctx) body.sessionContext = ctx;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });

      hideTyping(elMessages);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.fallback) {
          showFallback(elPanel);
        } else {
          throw new Error('Network error');
        }
        return;
      }

      const data = await response.json();
      if (!data.ok || !data.reply) {
        throw new Error('Invalid response');
      }

      sessionHistory.push({ role: 'assistant', content: data.reply, ts: Date.now() });
      saveHistory();
      renderMessages(elMessages);
    } catch (error) {
      hideTyping(elMessages);
      track('ai_consultant_error' as SiteEventName);
      showError(elPanel, 'AI-консультант временно недоступен. Вы можете оставить задачу или написать Виктору напрямую.');
    } finally {
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  clearBtn?.addEventListener('click', () => {
    sessionHistory = [];
    clearHandoff();
    saveHistory();
    renderMessages(elMessages);
    const welcome = elPanel.querySelector<HTMLElement>('[data-ai-welcome]');
    if (welcome) {
      welcome.hidden = false;
      elMessages.innerHTML = '';
      elMessages.appendChild(welcome);
    }
  });

  handoffBtn?.addEventListener('click', async () => {
    if (sessionHistory.length < 2) return;
    if (!endpoint) {
      location.hash = '#contact';
      return;
    }
    try {
      const body = {
        history: sessionHistory.slice(-20).map(({ role, content }) => ({ role, content })),
        intent: 'handoff',
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (data.ok && data.handoff) {
        setHandoff(data.handoff);
        saveConversationToStore(data.handoff);
        track('ai_consultant_handoff' as SiteEventName);
        const brief = document.querySelector<HTMLDetailsElement>('#brief');
        if (brief) {
          brief.open = true;
          brief.scrollIntoView({ behavior: 'smooth' });
        } else {
          location.hash = '#contact';
        }
      }
    } catch {
      location.hash = '#contact';
    }
  });
}

function showFallback(panel: HTMLElement) {
  const messagesArea = panel.querySelector<HTMLElement>('[data-ai-messages]');
  if (!messagesArea) return;
  const div = document.createElement('div');
  div.className = 'ai-consultant-fallback';
  div.innerHTML = `
    <p><strong>AI-консультант временно недоступен.</strong></p>
    <p>Вы можете <a href="#brief">оставить задачу</a>,
    <a href="https://t.me/Rotciv_kld" target="_blank" rel="noopener noreferrer">написать в Telegram</a>
    или <a href="mailto:vslpk@inbox.ru">отправить email</a>.</p>
  `;
  messagesArea.appendChild(div);
}
