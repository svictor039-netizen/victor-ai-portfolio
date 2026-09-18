/**
 * Lead Profile + Rule-based Qualification Engine
 *
 * P1.2 — deterministic scoring, no LLM, no sensitive traits.
 * Runs server-side only. Client cannot override scores.
 */

// ── Qualification statuses ──
export const QualificationStatus = {
  NEW: 'new',
  INCOMPLETE: 'incomplete',
  QUALIFIED: 'qualified',
  HIGH_INTENT: 'high_intent',
  NOT_READY: 'not_ready',
  NEEDS_REVIEW: 'needs_review',
};

// ── Scoring rules (deterministic, explainable) ──
const RULES = [
  {
    id: 'form_submitted',
    score: 30,
    condition: (profile) => Boolean(profile.task || profile.process),
    reason: 'Отправил форму с описанием задачи',
  },
  {
    id: 'brief_complete',
    score: 20,
    condition: (profile) =>
      Boolean(profile.process && profile.resources && profile.result),
    reason: 'Заполнил полный бриф (процесс, ресурсы, критерий успеха)',
  },
  {
    id: 'case_cta_click',
    score: 15,
    condition: (profile) =>
      profile.cta_history?.some((h) => h.name === 'case_cta_click'),
    reason: 'Нажал CTA на странице кейса',
  },
  {
    id: 'multi_project_view',
    score: 10,
    condition: (profile) => (profile.projects_viewed?.length || 0) >= 2,
    reason: 'Просмотрел несколько проектов',
  },
  {
    id: 'service_view',
    score: 8,
    condition: (profile) => (profile.services_viewed?.length || 0) >= 1,
    reason: 'Открыл карточку услуги',
  },
  {
    id: 'task_described',
    score: 10,
    condition: (profile) => Boolean(profile.task && profile.task.length > 30),
    reason: 'Указал конкретную бизнес-задачу',
  },
  {
    id: 'deadline_provided',
    score: 5,
    condition: (profile) => Boolean(profile.deadline),
    reason: 'Указал желаемый срок',
  },
  {
    id: 'telegram_click',
    score: 5,
    condition: (profile) =>
      profile.cta_history?.some((h) => h.name === 'telegram_click'),
    reason: 'Нажал на Telegram',
  },
  {
    id: 'contact_click',
    score: 5,
    condition: (profile) =>
      profile.cta_history?.some((h) => h.name === 'contact_click'),
    reason: 'Нажал на контактную ссылку',
  },
];

const STATUS_THRESHOLDS = [
  { status: QualificationStatus.HIGH_INTENT, min: 70 },
  { status: QualificationStatus.QUALIFIED, min: 45 },
  { status: QualificationStatus.NEEDS_REVIEW, min: 25 },
  { status: QualificationStatus.INCOMPLETE, min: 10 },
];

// ── Service catalogue (must match real site offerings) ──
const SERVICES = {
  AI_AGENT: 'AI-агенты',
  AI_SERVICE: 'AI-сервисы и приложения',
  AUTOMATION: 'Автоматизация процессов',
  WEB: 'Сайты и веб-системы',
  CONSULTING: 'Разбор задачи',
  PROTOTYPE: 'Прототип / MVP',
};

const PROJECT_THEME_MAP = {
  'kmk-ai-consultant': SERVICES.AI_AGENT,
  'ai-content-factory': SERVICES.AI_AGENT,
  'catch-job-bot': SERVICES.AI_AGENT,
  'b2b-leadflow': SERVICES.AUTOMATION,
  'travel-mcp-agent': SERVICES.AI_AGENT,
  'fairytales-infinite': SERVICES.AI_SERVICE,
  'leftover-food': SERVICES.AI_SERVICE,
  'donskoe39': SERVICES.WEB,
};

// ── Public API ──

export function buildLeadProfile(formData, leadContext) {
  const now = Date.now();
  return {
    lead_id: crypto.randomUUID ? crypto.randomUUID() : `${now}-${Math.random().toString(36).slice(2, 10)}`,
    session_id: leadContext?.session_id || '',
    created_at: now,
    updated_at: now,

    // Source
    source: leadContext?.utm?.utm_source || 'direct',
    utm_source: leadContext?.utm?.utm_source || '',
    utm_medium: leadContext?.utm?.utm_medium || '',
    utm_campaign: leadContext?.utm?.utm_campaign || '',
    utm_content: leadContext?.utm?.utm_content || '',
    utm_term: leadContext?.utm?.utm_term || '',
    landing_page: leadContext?.landing_page || '',
    referrer: leadContext?.referrer || '',

    // Behaviour
    pages_viewed: leadContext?.pages_viewed || [],
    projects_viewed: leadContext?.projects_viewed || [],
    services_viewed: leadContext?.services_viewed || [],
    cta_history: leadContext?.cta_history || [],

    // Provided data (from form)
    name: formData.name || '',
    contact: formData.contact || '',
    company: formData.company || '',
    role: formData.role || '',
    task: formData.task || '',
    desired_outcome: formData.result || '',
    urgency: formData.deadline ? 'specified' : 'unspecified',
    budget_range: '',
    preferred_contact_channel: inferContactChannel(formData.contact),

    // Consent
    contact_consent: true,
    marketing_consent: false,
    consent_version: '2026-09-09',

    // Qualification (filled by engine)
    qualification_status: '',
    lead_score: 0,
    score_reasons: [],
    interest_area: '',
    recommended_service: '',
    next_best_action: '',
  };
}

function inferContactChannel(contact) {
  if (!contact) return 'unknown';
  const c = String(contact).toLowerCase().trim();
  if (c.startsWith('@') || c.includes('t.me/') || /tg|telegram/.test(c)) return 'telegram';
  if (c.includes('@') && c.includes('.')) return 'email';
  if (/^\+?[\d\s\-()]{7,}$/.test(c)) return 'phone';
  return 'unknown';
}

export function qualify(profile) {
  let score = 0;
  const reasons = [];

  for (const rule of RULES) {
    if (rule.condition(profile)) {
      score += rule.score;
      reasons.push({ rule: rule.id, points: rule.score, reason: rule.reason });
    }
  }

  profile.lead_score = score;
  profile.score_reasons = reasons;

  // Status
  profile.qualification_status = QualificationStatus.NEW;
  for (const threshold of STATUS_THRESHOLDS) {
    if (score >= threshold.min) {
      profile.qualification_status = threshold.status;
      break;
    }
  }

  // Interest area
  profile.interest_area = detectInterestArea(profile);

  // Recommended service
  profile.recommended_service = recommendService(profile);

  // Next best action
  profile.next_best_action = suggestNextAction(profile);

  profile.updated_at = Date.now();
  return profile;
}

function detectInterestArea(profile) {
  const areas = [];
  if (profile.projects_viewed?.some((s) => PROJECT_THEME_MAP[s] === SERVICES.AI_AGENT)) areas.push('AI-агенты');
  if (profile.projects_viewed?.some((s) => PROJECT_THEME_MAP[s] === SERVICES.AUTOMATION)) areas.push('Автоматизация');
  if (profile.projects_viewed?.some((s) => PROJECT_THEME_MAP[s] === SERVICES.AI_SERVICE)) areas.push('AI-сервисы');
  if (profile.projects_viewed?.some((s) => PROJECT_THEME_MAP[s] === SERVICES.WEB)) areas.push('Веб-системы');
  if (profile.services_viewed?.includes('AI-агенты')) areas.push('AI-агенты');
  if (profile.services_viewed?.includes('Автоматизация процессов')) areas.push('Автоматизация');
  if (profile.services_viewed?.includes('AI-сервисы и приложения')) areas.push('AI-сервисы');
  if (profile.services_viewed?.includes('Сайты и веб-системы')) areas.push('Веб-системы');

  const task = String(profile.task || '').toLowerCase();
  if (/агент|бот|консультант|rag|чат|telegram/.test(task)) areas.push('AI-агенты');
  if (/автомат|n8n|интеграц|процесс|воркфлоу|workflow/.test(task)) areas.push('Автоматизация');
  if (/сайт|портал|веб|web|frontend/.test(task)) areas.push('Веб-системы');
  if (/приложение|mvp|прототип|сервис/.test(task)) areas.push('AI-сервисы');

  const unique = [...new Set(areas)];
  return unique.slice(0, 2).join(', ') || 'Уточнить при разговоре';
}

function recommendService(profile) {
  const areas = detectInterestArea(profile).split(', ');
  if (areas.includes('AI-агенты')) return SERVICES.AI_AGENT;
  if (areas.includes('Автоматизация')) return SERVICES.AUTOMATION;
  if (areas.includes('AI-сервисы')) return SERVICES.AI_SERVICE;
  if (areas.includes('Веб-системы')) return SERVICES.WEB;
  if (profile.task && profile.task.length > 50) return SERVICES.CONSULTING;
  return SERVICES.CONSULTING;
}

function suggestNextAction(profile) {
  if (profile.qualification_status === QualificationStatus.HIGH_INTENT) {
    return 'Предложить короткий созвон для уточнения задачи и подготовки оценки';
  }
  if (profile.qualification_status === QualificationStatus.QUALIFIED) {
    return 'Ответить по контакту и предложить обсудить подход к решению';
  }
  if (profile.qualification_status === QualificationStatus.NEEDS_REVIEW) {
    return 'Ответить по контакту, уточнить задачу и предложить подходящий формат';
  }
  if (profile.preferred_contact_channel === 'telegram') {
    return 'Написать в Telegram с уточнением задачи';
  }
  return 'Ответить по указанному контакту и предложить следующий шаг';
}

export function formatQualificationSummary(profile) {
  const lines = [];
  lines.push('--- Квалификация лида ---');
  lines.push(`Статус: ${profile.qualification_status}`);
  lines.push(`Score: ${profile.lead_score}`);
  lines.push(`Интерес: ${profile.interest_area}`);
  lines.push(`Рекомендуемый сервис: ${profile.recommended_service}`);
  lines.push(`Следующий шаг: ${profile.next_best_action}`);
  if (profile.score_reasons.length) {
    lines.push(`Причины score:`);
    for (const r of profile.score_reasons) {
      lines.push(`  +${r.points} — ${r.reason}`);
    }
  }
  return lines.join('\n');
}
