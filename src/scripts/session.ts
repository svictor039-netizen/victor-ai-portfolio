/**
 * Session ID and visitor context — first-party, no fingerprinting, no PII.
 *
 * Storage:
 * - sessionStorage: session context (cleared when tab closes).
 *
 * No persistent user ID. No localStorage markers. No IP, canvas, fonts, or hardware signals.
 */
export interface LeadContext {
  session_id: string;
  first_seen: number;
  last_seen: number;
  landing_page: string;
  current_page: string;
  referrer: string;
  utm: Record<string, string>;
  pages_viewed: string[];
  projects_viewed: string[];
  services_viewed: string[];
  cta_history: { name: string; page: string; timestamp: number }[];
}

const SESSION_KEY = 'victor_session';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function normalizePageUrl(): string {
  if (typeof location === 'undefined') return '';
  return location.origin + location.pathname;
}

function normalizeReferrer(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return '';
  }
}

function getUTMParams(): Record<string, string> {
  if (typeof location === 'undefined') return {};
  const params = new URLSearchParams(location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

export function getOrCreateSession(): LeadContext {
  let session: LeadContext | null = null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) session = JSON.parse(raw);
  } catch {}

  const now = Date.now();
  const currentPage = normalizePageUrl();
  const referrer = typeof document !== 'undefined' ? normalizeReferrer(document.referrer) : '';

  if (session) {
    session.last_seen = now;
    session.current_page = currentPage;
    if (!session.pages_viewed.includes(currentPage)) {
      session.pages_viewed.push(currentPage);
    }
    if (session.pages_viewed.length > 50) {
      session.pages_viewed = session.pages_viewed.slice(-50);
    }
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    return session;
  }

  const utm = getUTMParams();
  const landing = currentPage;

  session = {
    session_id: generateUUID(),
    first_seen: now,
    last_seen: now,
    landing_page: landing,
    current_page: landing,
    referrer,
    utm,
    pages_viewed: [landing],
    projects_viewed: [],
    services_viewed: [],
    cta_history: [],
  };

  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
  return session;
}

export function saveSession(session: LeadContext) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

export function recordProjectView(slug: string) {
  const session = getOrCreateSession();
  if (!session.projects_viewed.includes(slug)) {
    session.projects_viewed.push(slug);
    saveSession(session);
  }
}

export function recordServiceView(name: string) {
  const session = getOrCreateSession();
  if (!session.services_viewed.includes(name)) {
    session.services_viewed.push(name);
    saveSession(session);
  }
}

export function recordCTA(name: string) {
  const session = getOrCreateSession();
  session.cta_history.push({
    name,
    page: normalizePageUrl(),
    timestamp: Date.now(),
  });
  if (session.cta_history.length > 20) {
    session.cta_history = session.cta_history.slice(-20);
  }
  saveSession(session);
}

/**
 * Returns a safe subset of session context for attaching to lead form payloads.
 * Does not include first_seen / last_seen to minimize data.
 */
export function getLeadContextForForm(): Pick<
  LeadContext,
  'session_id' | 'landing_page' | 'referrer' | 'utm' | 'pages_viewed' | 'projects_viewed' | 'services_viewed' | 'cta_history'
> {
  const session = getOrCreateSession();
  return {
    session_id: session.session_id,
    landing_page: session.landing_page,
    referrer: session.referrer,
    utm: session.utm,
    pages_viewed: session.pages_viewed,
    projects_viewed: session.projects_viewed,
    services_viewed: session.services_viewed,
    cta_history: session.cta_history,
  };
}
