# Victor AI Portfolio — Back Office / Admin / Growth & Operations Architecture Addendum

> This section is authoritative project guidance. It extends, but does not replace, the existing PLAN.md.
> The public Astro site remains the customer-facing product. The Back Office is a separate internal control plane.

## Strategic target

The long-term system is:

**Public portfolio + AI Consultant + Lead Intelligence + Qualification + CRM context + Funnels + Lead Magnets + Email/Inbox + SEO/Search + Advertising + Analytics + Logs/Health + Secrets/Integrations + AI Operations Back Office.**

The business loop to optimize is:

**traffic/source → visitor intent → relevant content → AI consultation → lead → qualification → follow-up → deal → attribution/learning.**

The Back Office must make this loop observable, controllable, auditable, and safe.

## 1. Target architecture

```text
PUBLIC SITE
Astro / React / current design system
        │
        ├── first-party events / consent-aware analytics
        ├── AI Consultant
        ├── LeadForm / brief
        └── project/service content
        │
        ▼
API / WORKER / SERVER LAYER
        │
        ├── validation
        ├── LeadProfile
        ├── qualification engine
        ├── LLM provider abstraction
        ├── integrations
        └── security / rate limits / audit
        │
        ▼
PRIMARY DATA STORE
SQLite (MVP) → PostgreSQL / Cloudflare D1 (production)
        │
        ▼
CUSTOM BACK OFFICE (Astro + React + Tailwind)
internal only
        │
        ├── Leads / Contacts / Companies
        ├── AI Conversations
        ├── Projects / Services / Work Formats
        ├── Funnels / Lead Magnets
        ├── Email / Inbox
        ├── Analytics / Attribution
        ├── SEO / Search
        ├── Advertising
        ├── Logs / Health
        ├── Integrations / Secrets Status
        └── Settings / Permissions / Audit
```

The public site MUST NOT be rewritten to Django merely to gain an admin panel.
**Django is used ONLY as a reference for UX/admin mechanics.** The Back Office is built on the same Astro + React + Tailwind stack.

## 2. Back Office mechanics to adopt

Use Django/Admin patterns as Back Office UX reference: tables, filters, search, detail pages, inline data, bulk actions, read-only fields, validation, autocomplete, permissions, change history, auditability.

Required mechanics:

- explicit data models;
- CRUD for approved internal entities;
- tabular list views;
- sortable columns;
- server-side filters;
- server-side search;
- detail pages;
- related-object inlines;
- bulk actions;
- read-only system fields;
- model/form validation;
- autocomplete for relations;
- status/workflow transitions;
- permissions and roles;
- change history / audit trail;
- internal authentication;
- safe admin actions;
- import/export only where explicitly needed.

### Core entity examples

- Lead
- Contact
- Company
- Session
- Event
- Conversation
- AIHandoff
- QualificationSnapshot
- Project
- Service
- WorkFormat
- Funnel
- LeadMagnet
- EmailMessage
- EmailSequence
- Campaign
- AttributionTouch
- SearchQueryMetric
- PageSeoState
- AdvertisingCampaignMetric
- SystemLog
- IntegrationStatus
- AuditEvent

Do not create data models merely because a framework makes them easy. Every model must serve a real operational workflow.

## 3. Lead / CRM Back Office

### Lead list

Minimum columns:
- lead_id;
- name/contact when provided;
- company when provided;
- source / UTM;
- interest_area;
- lead_score;
- qualification_status;
- recommended_service;
- next_best_action;
- created_at;
- updated_at.

Minimum filters:
- status;
- score range;
- interest;
- source;
- UTM campaign;
- date;
- recommended service;
- follow-up state.

Minimum search:
- name;
- email/contact;
- company;
- task;
- project/service;
- AI summary.

### Lead detail

One lead detail page should aggregate:
- contact/provided identity;
- company/role if provided;
- task / desired outcome;
- consent state;
- source / UTM / attribution;
- viewed pages/projects/services;
- CTA history;
- qualification score + reasons;
- AI Consultant conversation;
- AI handoff;
- email history;
- notes;
- timeline;
- next-best action;
- audit history.

System-generated provenance fields should normally be read-only.

## 4. AI Conversations

Back Office should support:
- conversation list;
- linked lead/session;
- timestamp;
- model/provider;
- fallback/error state;
- structured handoff;
- conversation summary;
- prompt-injection/security flags where detected;
- manual review status;
- link to resulting LeadProfile.

Do not expose full system prompts or secrets in the UI.
Do not treat AI summaries as verified facts unless confirmed by user-provided data.

## 5. Projects / Services / Work Formats

Back Office may manage public content only after a content-editing workflow is explicitly approved.

Capabilities to plan:
- draft/published status;
- title/slug;
- summary;
- project status: prototype/MVP/demo/production;
- screenshots/assets;
- technology;
- links;
- SEO fields;
- ordering;
- related services;
- related lead magnets;
- visibility/noindex controls.

Never invent metrics, clients, results, prices, or READY statuses.

## 6. Funnels and Lead Magnets

Plan for:
- funnel stage;
- source;
- entry page;
- CTA;
- lead magnet;
- conversion events;
- contact/brief completion;
- qualification outcome;
- follow-up status;
- unsubscribe/consent state.

Lead magnets may include:
- mini-audit;
- checklist;
- case study;
- AI-readiness assessment;
- automation opportunity map;
- estimate questionnaire;
- demo booking;
- project brief.

No dark patterns. No silent subscription.

## 7. Email / Inbox

Future Back Office capabilities:
- incoming email list;
- linked lead/contact/company;
- classification;
- priority;
- summary;
- draft reply;
- approval state;
- sent state;
- sequence/follow-up status;
- unsubscribe state.

AI may classify, summarize, segment, and draft.
Human approval is required by default for legal/financial commitments, unusual commercial offers, negotiations, complaints, and sensitive/confidential content.
Auto-send is allowed only under explicit low-risk rules approved later.

## 8. Analytics and attribution

The system should connect marketing source to business outcome.

```text
campaign / search / referral
→ landing
→ visitor/session events
→ project/service interest
→ AI Consultant
→ lead
→ qualification
→ follow-up
→ deal/outcome
```

Analytics should eventually support:
- first-party event stream;
- funnel conversion;
- project/service popularity;
- high-intent lead detection;
- source/UTM attribution;
- campaign attribution;
- drop-off;
- returning lead behavior only where consent permits;
- qualified-lead rate;
- cost per lead;
- cost per qualified lead;
- cost per high-intent lead;
- campaign-to-deal attribution where data exists.

Do not optimize only for pageviews/clicks.

## 9. SEO / Search system

Create a dedicated Back Office area for SEO/Search.

### Technical SEO
- page status;
- indexability;
- title;
- meta description;
- canonical;
- robots directives;
- sitemap inclusion;
- schema.org presence;
- redirects;
- 404s;
- broken links;
- duplicate metadata;
- noindex state;
- crawl/index errors.

### Search performance
Integrate Google Search Console when approved:
- query;
- page;
- clicks;
- impressions;
- CTR;
- average position;
- date;
- device/country where lawful and useful;
- indexing status where available.

Use search data to identify pages gaining/losing visibility, useful queries, content gaps, and pages needing updates.
AI SEO recommendations are suggestions only unless an explicit publishing workflow is approved.

## 10. Yandex / Google marketing integrations

### Yandex Metrika
Plan to surface visits/sessions, sources, goals, events, entry pages, geography at non-sensitive aggregate level, advertising traffic, and funnel events.

### Yandex Direct
Plan to surface campaigns, ads/ad groups where useful, spend, clicks, CPC, conversions, qualified leads, high-intent leads, cost per qualified lead, and campaign → lead → outcome attribution.
Do not judge campaign quality from clicks alone.

### Google Ads
Optional future integration: spend, clicks, CPC, conversions, qualified leads, attribution.

### Google Search Console
Treat as SEO/search data, not advertising.

All external integrations must use approved API credentials and least-privilege access.

## 11. Logs / observability / system health

Create Back Office sections for application logs, health, and operational metrics.

Application logs:
- API/Worker errors;
- lead submission errors;
- AI Consultant errors;
- provider failures;
- validation failures;
- email delivery failures;
- integration failures.

Health:
- public site;
- API/Worker;
- database;
- LLM provider;
- email provider;
- Turnstile;
- analytics connectors;
- Google integrations;
- Yandex integrations.

Operational metrics:
- request count;
- error rate;
- latency;
- LLM latency;
- fallback rate;
- email delivery state;
- failed/retried jobs.

Rules:
- never log API keys/tokens/secrets;
- avoid unnecessary full PII in logs;
- do not log full system prompts;
- do not log full conversation history by default;
- logs require retention limits and access control.

## 12. Secrets and integrations

Back Office must manage integration **status**, not expose secret values.

UI may show:
- integration name;
- configured / missing;
- healthy / failing;
- environment;
- last successful check;
- last error summary;
- credential expiry metadata when available;
- scopes/permissions summary where safe.

UI must not show raw API keys, bearer tokens, private keys, passwords, secret values, or OAuth refresh tokens.

Secrets should live in approved secret stores / runtime environment, e.g. environment variables for local dev, Cloudflare secrets, GitHub Actions secrets, deployment-platform secrets, or later a dedicated secret manager if justified.

No secret may be hardcoded, committed, exposed to browser bundles, written to logs, displayed in admin, or stored as plain text in normal application tables.

Plan separate environment status:
- DEV
- STAGING
- PRODUCTION

## 13. Roles / permissions / audit

Plan for roles such as Owner, Admin, Operator, Content Editor, Analyst, Viewer.
Default to least privilege.

Audit events should capture who, what, object, before/after where appropriate, timestamp, and source action.
High-risk actions should require explicit confirmation.

## 14. AI Operations inside Back Office

Future AI agents may operate through the Back Office:
- Visitor Intent Agent;
- Lead Qualification Agent;
- Lead Intelligence Agent;
- Funnel Agent;
- Email Campaign Agent;
- Inbox Agent;
- Analytics Agent;
- SEO Agent;
- Advertising Agent.

AI agents do not receive unrestricted secrets.
AI actions must respect permissions, audit rules, consent, and approval boundaries.

## 15. KokonutUI = UX mechanics store, NOT a design system

KokonutUI is approved as a **catalog/store of ready UX mechanics**.
It is NOT a replacement design system, a new global visual language, permission to restyle the whole site, or permission to add effects because they look impressive.

Use KokonutUI to discover proven mechanics such as AI inputs, search/action bars, tabs, drawers, file upload, loaders, cards, bento layouts, selective liquid-glass surfaces, restrained motion, navigation/toolbar patterns.

Rules:
1. Search/browse first.
2. Show 1–3 candidate components.
3. Explain UX benefit and dependencies.
4. Wait for Victor's explicit selection before installation.
5. Adapt selected code to existing design tokens.
6. Preserve accessibility, mobile behavior, keyboard support, reduced motion.
7. One coherent visual system.
8. Do not stack unrelated effects.
9. Do not introduce a second CSS/design framework.
10. No component installation solely for decoration.

## 16. MCP strategy

### KokonutUI / shadcn MCP
Approved for Claude Code and Codex as a discovery/install interface.
Purpose: browse registry, inspect component code/dependencies, compare UX mechanics, install only after explicit approval.
Project registry should include:
`@kokonutui: https://kokonutui.com/r/{name}.json`

### Back Office MCP
No Back Office MCP is currently enabled.
A third-party candidate may be evaluated once the Back Office exists and has robust auth.

Rules before enabling Back Office through MCP:
- Back Office must exist first;
- expose only explicitly approved data;
- use field allowlists;
- respect permissions;
- least privilege;
- bearer/auth token stored as a secret;
- no secrets exposed;
- high-risk write/delete/bulk actions require approval;
- audit MCP-driven changes;
- start read-only where possible.

Do not install or expose a Back Office MCP merely because it is available.

## 17. Delivery phases

### Phase A — current
- P1/P1.2 Lead Intelligence foundation;
- P2 AI Consultant;
- P2.1 acceptance.

### Phase B — persistent Lead Intelligence
- SQLite server-side persistence;
- Lead/Contact/Company/Event models;
- attribution timeline;
- deduplication;
- migration strategy.

### Phase C — Back Office MVP (done)
- Authentication — server-side username/password, scrypt hash, HttpOnly SameSite Secure cookie, SQLite sessions;
- Pages — Dashboard, Leads, Lead Detail, AI Conversations, SEO, System;
- Leads table — server-side search, filters (status), sort, delete;
- Lead detail — readonly fields (identity, task, qualification, session, AI handoff);
- AI Conversations — list with messages, handoff summary;
- SEO — static analysis + server-side page_seo_state;
- System — integration status from SQLite, health indicators, logs from SQLite;
- Data layer — SQLite via `node:sqlite` (`src/lib/db.ts`); tables: sessions, leads, conversations, system_logs, audit_events, integration_status, page_seo_state;
- API routes — auth/login, auth/logout, auth/check, ingest, leads, conversations, system, seo;
- Worker ingestion — POST `/api/ingest/` with Bearer token, dedup by lead_id;
- No localStorage as primary DB; no PUBLIC_ADMIN_PIN;
- Astro build passes, server-side tests pass.

### Phase D — Growth Operations
- funnels;
- lead magnets;
- email/inbox;
- SEO/Search Console;
- Yandex Metrika;
- Yandex Direct;
- optional Google Ads;
- attribution.

### Phase E — Operations & AI
- logs/health;
- integration status;
- secrets status;
- analytics dashboards;
- SEO Agent;
- Advertising Agent;
- Inbox Agent;
- Analytics Agent.

Each phase requires explicit approval before implementation.

## 18. Definition of Done for Back Office features

A Back Office feature is not done until:
- data source is real;
- permissions are defined;
- validation exists;
- secrets are protected;
- audit behavior is known;
- empty/error/loading states exist;
- tests pass;
- no public-site regression;
- no invented business data;
- documentation reflects actual state;
- no commit/push/deploy unless explicitly approved by Victor.
