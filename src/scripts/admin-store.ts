/**
 * Admin Back Office data store.
 * MVP uses localStorage as a lightweight client-side database.
 * In production, replace with Cloudflare KV, Supabase, or a persistent backend.
 */

const LEADS_KEY = 'victor_admin_leads';
const CONVERSATIONS_KEY = 'victor_admin_conversations';
const EVENTS_KEY = 'victor_admin_events';

export interface StoredLead {
  id: string;
  kind: 'request' | 'brief';
  name: string;
  contact: string;
  task: string;
  process?: string;
  resources?: string;
  result?: string;
  deadline?: string;
  source: string;
  landingPage?: string;
  referrer?: string;
  utm?: Record<string, string>;
  pagesViewed?: string[];
  projectsViewed?: string[];
  servicesViewed?: string[];
  ctaHistory?: { name: string; page: string; timestamp: number }[];
  aiHandoff?: {
    task?: string;
    desired_outcome?: string;
    urgency?: string;
    interest_area?: string;
    recommended_service?: string;
    relevant_projects?: string[];
    conversation_summary?: string;
  };
  qualificationStatus?: string;
  leadScore?: number;
  scoreReasons?: string[];
  recommendedService?: string;
  nextBestAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredConversation {
  id: string;
  sessionId: string;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: number }[];
  handoff?: StoredLead['aiHandoff'];
  model?: string;
  fallback?: boolean;
  error?: boolean;
  createdAt: string;
}

export interface StoredEvent {
  id: string;
  type: string;
  sessionId: string;
  page?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

function getItem<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// Leads
export function getLeads(): StoredLead[] {
  return getItem<StoredLead>(LEADS_KEY);
}

export function saveLead(lead: StoredLead) {
  const leads = getLeads();
  const idx = leads.findIndex((l) => l.id === lead.id);
  if (idx >= 0) {
    leads[idx] = lead;
  } else {
    leads.unshift(lead);
  }
  setItem(LEADS_KEY, leads);
}

export function getLeadById(id: string): StoredLead | undefined {
  return getLeads().find((l) => l.id === id);
}

export function deleteLead(id: string) {
  setItem(
    LEADS_KEY,
    getLeads().filter((l) => l.id !== id)
  );
}

// Conversations
export function getConversations(): StoredConversation[] {
  return getItem<StoredConversation>(CONVERSATIONS_KEY);
}

export function saveConversation(conv: StoredConversation) {
  const convs = getConversations();
  const idx = convs.findIndex((c) => c.id === conv.id);
  if (idx >= 0) {
    convs[idx] = conv;
  } else {
    convs.unshift(conv);
  }
  setItem(CONVERSATIONS_KEY, convs);
}

export function getConversationById(id: string): StoredConversation | undefined {
  return getConversations().find((c) => c.id === id);
}

// Events
export function getEvents(): StoredEvent[] {
  return getItem<StoredEvent>(EVENTS_KEY);
}

export function saveEvent(event: StoredEvent) {
  const events = getEvents();
  events.unshift(event);
  setItem(EVENTS_KEY, events);
}

// Export
export function exportLeadsAsJson(): string {
  return JSON.stringify(getLeads(), null, 2);
}

export function exportConversationsAsJson(): string {
  return JSON.stringify(getConversations(), null, 2);
}
