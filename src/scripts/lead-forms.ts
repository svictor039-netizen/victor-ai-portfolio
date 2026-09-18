type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile; } }

let challengeLoader: Promise<Turnstile> | undefined;
function loadChallenge() {
  if (!challengeLoader) challengeLoader = new Promise<Turnstile>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const timer = window.setTimeout(() => reject(new Error('challenge')), 15000);
    script.onload = () => {
      clearTimeout(timer);
      window.turnstile ? resolve(window.turnstile) : reject(new Error('challenge'));
    };
    script.onerror = () => { clearTimeout(timer); reject(new Error('challenge')); };
    document.head.append(script);
  });
  return challengeLoader;
}

/* Lazy imports to keep the form working even if analytics modules fail to load */
async function safeTrack(name: string, payload?: Record<string, unknown>) {
  try {
    const { track } = await import('./events');
    track(name as import('./events').SiteEventName, payload);
  } catch {}
}

async function getLeadContext() {
  try {
    const { getLeadContextForForm } = await import('./session');
    return getLeadContextForForm();
  } catch {
    return undefined;
  }
}

function getAiHandoff() {
  try {
    const raw = sessionStorage.getItem('victor_ai_handoff');
    if (raw) return JSON.parse(raw);
  } catch {}
  return undefined;
}

function clearAiHandoff() {
  try { sessionStorage.removeItem('victor_ai_handoff'); } catch {}
}

export function initLeadForms() {
  document.querySelectorAll<HTMLFormElement>('[data-lead-form]').forEach(form => {
    if (form.dataset.initialized) return;
    form.dataset.initialized = 'true';
    const button = form.querySelector<HTMLButtonElement>('[data-submit]')!;
    const status = form.querySelector<HTMLElement>('[data-status]')!;
    const fieldset = form.querySelector('fieldset')!;
    const endpoint = form.dataset.endpoint;
    const sitekey = form.dataset.sitekey;
    const buttonLabels = button.querySelectorAll<HTMLElement>('[data-cta-label]');
    const buttonLabel = buttonLabels[0]?.textContent ?? button.textContent;
    const setButtonLabel = (label: string | null) => {
      if (buttonLabels.length) buttonLabels.forEach(node => { node.textContent = label; });
      else button.textContent = label;
    };
    let token = '';
    let busy = false;
    let complete = false;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    let requestId = '';
    let fingerprint = '';
    let started = false;

    // Prefill from AI Consultant handoff if available
    const aiHandoff = getAiHandoff();
    if (aiHandoff?.task) {
      const taskInput = form.querySelector<HTMLTextAreaElement>('textarea[name="task"]');
      if (taskInput && !taskInput.value) {
        taskInput.value = aiHandoff.task;
        taskInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    function announce(message: string, state = 'idle') {
      form.dataset.state = state;
      status.textContent = message;
    }

    function markStarted() {
      if (started) return;
      started = true;
      const kind = form.dataset.kind || 'request';
      safeTrack('lead_form_start', { kind });
      if (kind === 'brief') safeTrack('brief_start');
    }

    form.addEventListener('input', markStarted, { once: true });
    form.addEventListener('focusin', markStarted, { once: true });

    form.addEventListener('input', event => {
      const input = event.target;
      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) input.setCustomValidity('');
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy || complete) return;
      if (!endpoint || !sitekey) {
        announce('Отправка через сайт сейчас недоступна. Напишите в Telegram или на email — ссылки ниже.', 'error');
        return;
      }
      for (const input of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[type="text"], textarea')) {
        input.setCustomValidity(input.required && !input.value.trim() ? 'Заполните это поле.' : '');
      }
      if (!form.reportValidity()) return;
      if (!token) {
        announce('Пройдите проверку перед отправкой. Если она недоступна, напишите в Telegram.', 'error');
        return;
      }
      markStarted();
      const data = new FormData(form);
      const payload: Record<string, unknown> = { kind: form.dataset.kind, consent: data.get('consent') === 'on', consentVersion: '2026-09-09' };
      for (const name of ['name', 'contact', 'task', 'process', 'resources', 'result', 'deadline', 'website']) {
        payload[name] = String(data.get(name) || '').trim();
      }
      const nextFingerprint = JSON.stringify(payload);
      if (nextFingerprint !== fingerprint) {
        requestId = crypto.randomUUID();
        fingerprint = nextFingerprint;
      }
      const leadContext = await getLeadContext();
      safeTrack('lead_form_submit', { kind: form.dataset.kind });
      busy = true;
      fieldset.disabled = true;
      form.setAttribute('aria-busy', 'true');
      setButtonLabel('Отправляем…');
      announce('Отправляем обращение…');
      try {
        const body: Record<string, unknown> = { ...payload, requestId, turnstileToken: token };
        if (leadContext) body.leadContext = leadContext;
        if (aiHandoff) body.aiHandoff = aiHandoff;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(25000),
        });
        const result = await response.json();
        if (!response.ok || result.ok !== true) {
          const messages: Record<string, string> = {
            validation: 'Проверьте обязательные поля и согласие на обработку данных.',
            challenge: 'Проверка истекла или не пройдена. Пройдите её ещё раз.',
            unavailable: 'Отправка сейчас недоступна. Напишите в Telegram или на email.',
            delivery: 'Не удалось подтвердить отправку. Повторите попытку или напишите в Telegram.',
          };
          throw new Error(messages[result.code] || 'Не удалось отправить обращение. Попробуйте ещё раз или напишите в Telegram.');
        }
        complete = true;
        form.reset();
        clearAiHandoff();
        announce('Обращение принято почтовым сервисом. Виктор рассмотрит задачу и ответит по указанному контакту. Если нужно дополнить обращение, напишите в Telegram.', 'success');
        setButtonLabel('Обращение принято');
        safeTrack('lead_form_success', { kind: form.dataset.kind });
        if (form.dataset.kind === 'brief') safeTrack('brief_complete');

        // Save to localStorage Back Office (MVP)
        try {
          const { saveLead } = await import('./admin-store');
          const ctx = (leadContext || {}) as Record<string, unknown>;
          saveLead({
            id: requestId,
            kind: (form.dataset.kind as 'request' | 'brief') || 'request',
            name: String(data.get('name') || ''),
            contact: String(data.get('contact') || ''),
            task: String(data.get('task') || ''),
            process: String(data.get('process') || ''),
            resources: String(data.get('resources') || ''),
            result: String(data.get('result') || ''),
            deadline: String(data.get('deadline') || ''),
            source: 'website',
            landingPage: (ctx.landing_page as string) || '',
            referrer: (ctx.referrer as string) || '',
            utm: (ctx.utm as Record<string, string>) || {},
            pagesViewed: (ctx.pages_viewed as string[]) || [],
            projectsViewed: (ctx.projects_viewed as string[]) || [],
            servicesViewed: (ctx.services_viewed as string[]) || [],
            ctaHistory: (ctx.cta_history as { name: string; page: string; timestamp: number }[]) || [],
            aiHandoff: aiHandoff,
            qualificationStatus: 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch {}
      } catch (error) {
        const code = error instanceof Error && error.message ? 'delivery' : 'unknown';
        safeTrack('lead_form_error', { kind: form.dataset.kind, code });
        announce(error instanceof Error && error.name === 'Error' ? error.message : 'Не удалось подтвердить отправку: проверьте соединение. Ответы сохранены в форме — повторите попытку или напишите в Telegram.', 'error');
      } finally {
        busy = false;
        token = '';
        form.removeAttribute('aria-busy');
        if (!complete) {
          fieldset.disabled = false;
          setButtonLabel(buttonLabel);
          button.disabled = true;
          if (api && widget !== undefined) api.reset(widget);
        }
      }
    });

    if (!endpoint || !sitekey) return;
    announce('Загружаем проверку перед отправкой…');
    // Load the external anti-spam widget only when this form enters the viewport.
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      loadChallenge().then(challenge => {
        api = challenge;
        widget = api.render(form.querySelector<HTMLElement>('[data-challenge]')!, {
          sitekey, action: 'lead', size: 'flexible',
          callback: (value: string) => {
            token = value;
            if (!busy && !complete) { button.disabled = false; announce('Можно отправить обращение.'); }
          },
          'expired-callback': () => { token = ''; button.disabled = true; if (!busy && !complete) announce('Проверка истекла. Пройдите её ещё раз.', 'error'); },
          'error-callback': () => { token = ''; button.disabled = true; if (!busy && !complete) announce('Проверка недоступна. Обновите страницу или напишите в Telegram.', 'error'); },
        });
      }).catch(() => announce('Не удалось загрузить проверку. Обновите страницу или напишите в Telegram.', 'error'));
    });
    observer.observe(form);
  });
}
