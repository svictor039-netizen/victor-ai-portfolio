/**
 * Event taxonomy — P1 AI Lead Intelligence Foundation.
 *
 * Зарезервированные события, которые пока не отправляются,
 * потому что соответствующих функций на сайте ещё нет:
 * - ai_consultant_open
 * - ai_consultant_message
 * - lead_magnet_view
 * - lead_magnet_submit
 */
export type SiteEventName =
  | 'page_view'
  | 'project_view'
  | 'service_view'
  | 'case_cta_click'
  | 'contact_click'
  | 'telegram_click'
  | 'email_click'
  | 'brief_start'
  | 'brief_complete'
  | 'lead_form_start'
  | 'lead_form_submit'
  | 'lead_form_success'
  | 'lead_form_error'
  | 'ai_consultant_open'
  | 'ai_consultant_message'
  | 'ai_consultant_error'
  | 'ai_consultant_handoff'
  | 'lead_magnet_view'
  | 'lead_magnet_submit'
  | 'returning_session';

export interface SiteEvent {
  name: SiteEventName;
  timestamp: number;
  page: string;
  payload?: Record<string, unknown>;
}

type Handler = (event: SiteEvent) => void;
const handlers: Handler[] = [];

export function onEvent(handler: Handler): () => void {
  handlers.push(handler);
  return () => {
    const i = handlers.indexOf(handler);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function track(name: SiteEventName, payload?: Record<string, unknown>) {
  const event: SiteEvent = {
    name,
    timestamp: Date.now(),
    page: typeof location !== 'undefined' ? location.pathname + location.search : '',
    payload,
  };
  for (const h of handlers) {
    try { h(event); } catch {}
  }
}
