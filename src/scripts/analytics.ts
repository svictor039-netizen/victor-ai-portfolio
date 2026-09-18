/**
 * Consent-aware first-party analytics initialization.
 *
 * Tracks lawful first-party events only:
 * - page views, project/service views, CTA clicks.
 * - No fingerprinting, no PII, no hidden persistent ID.
 *
 * Events are logged to sessionStorage for lead context enrichment.
 *
 * returning_session is temporarily disabled until a consent mechanism
 * for persistent markers is approved.
 */
import { onEvent, track } from './events';
import { getOrCreateSession, recordProjectView, recordServiceView, recordCTA } from './session';

const EVENT_LOG_KEY = 'victor_event_log';

type LoggedEvent = {
  name: string;
  timestamp: number;
  page: string;
  payload?: Record<string, unknown>;
};

function appendEventLog(event: LoggedEvent) {
  try {
    const raw = sessionStorage.getItem(EVENT_LOG_KEY);
    const log: LoggedEvent[] = raw ? JSON.parse(raw) : [];
    log.push(event);
    if (log.length > 100) log.shift();
    sessionStorage.setItem(EVENT_LOG_KEY, JSON.stringify(log));
  } catch {}
}

export function initAnalytics() {
  // Initialize session on every page load
  getOrCreateSession();

  // Persist events for lead context
  onEvent(event => appendEventLog(event));

  // Page view
  track('page_view');

  // Returning session detection disabled until consent-approved persistent marker.
  // if (isReturningVisitor()) { track('returning_session'); }

  // Project view detection
  const isCasePage = document.querySelector('.case-page') !== null;
  if (isCasePage) {
    const slug = location.pathname.split('/').filter(Boolean).pop();
    if (slug) {
      recordProjectView(slug);
      track('project_view', { slug });
    }
  }

  // Service view detection via IntersectionObserver (single fire per card)
  const serviceCards = document.querySelectorAll<HTMLElement>('[data-service-name]');
  if (serviceCards.length > 0) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const name = (entry.target as HTMLElement).dataset.serviceName;
            if (name) {
              recordServiceView(name);
              track('service_view', { name });
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.5 }
    );
    serviceCards.forEach(card => observer.observe(card));
  }

  // Delegated click tracking for data-event attributes
  document.addEventListener(
    'click',
    e => {
      const target = e.target as HTMLElement;
      const el = target.closest<HTMLElement>('[data-event]');
      if (!el) return;
      const eventName = el.dataset.event;
      if (!eventName) return;

      const payload: Record<string, unknown> = {};
      if (el.dataset.eventPayload) {
        try {
          Object.assign(payload, JSON.parse(el.dataset.eventPayload));
        } catch {}
      }

      recordCTA(eventName);
      track(eventName as import('./events').SiteEventName, payload);
    },
    { passive: true }
  );
}
