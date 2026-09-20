# Victor AI Portfolio — Back Office / Growth Operations Vision Addendum

> Merge this section into README.md as the high-level product and architecture overview.

## Product vision extension

Victor AI Portfolio is evolving from a public portfolio into an integrated commercial AI system:

**Portfolio + AI Consultant + Lead Intelligence + Qualification + Back Office + Funnels + Email/Inbox + SEO/Search + Advertising + Analytics + Observability.**

The public site remains customer-facing.
The Back Office becomes Victor's internal operating system for leads, content, marketing, AI and technical health.

## Architecture

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

The public site MUST NOT be rewritten to another framework merely to gain an admin panel.
**Django is used ONLY as a reference for UX/admin mechanics.** The Back Office is built on the same Astro + React + Tailwind stack.

## Back Office target

```text
Dashboard

Leads
├─ Contacts / Companies
├─ Qualification
├─ Timeline
├─ AI Summary
└─ Follow-up

AI Conversations
├─ Sessions
├─ Handoffs
├─ Fallback / errors
└─ Review

Projects / Services
├─ Cases
├─ Work Formats
└─ Content status

Funnels / Lead Magnets
Email / Inbox

Analytics
├─ First-party events
├─ Funnel
├─ UTM / Attribution
└─ Qualified-lead outcomes

SEO / Search
├─ Technical SEO
├─ Google Search Console
├─ Queries / pages
├─ Indexing
└─ Content opportunities

Advertising
├─ Yandex Metrika
├─ Yandex Direct
├─ optional Google Ads
└─ Campaign → Lead → Outcome

System
├─ Logs
├─ Errors
├─ Health
├─ API / Worker
├─ LLM
├─ Email
└─ Integrations

Security / Operations
├─ Secrets status
├─ Environment status
├─ Permissions
└─ Audit history
```

## Back Office mechanics to adopt

Use Django/Admin patterns as Back Office UX reference: tables, filters, search, detail pages, inline data, bulk actions, read-only fields, validation, autocomplete, permissions, change history, auditability.

## Marketing / search / attribution

The system should connect traffic to business value:

`Search / Direct / referral / campaign → landing → visitor behavior → AI Consultant → LeadProfile → qualification → follow-up → outcome`

Planned sources:
- Google Search Console;
- Yandex Metrika;
- Yandex Direct;
- optional Google Ads;
- first-party events;
- UTM attribution.

The goal is not just to count traffic/clicks. The goal is to understand which sources produce qualified and high-intent leads.

## Logs / health

The Back Office should expose safe operational status for site, API/Worker, LLM provider, database, Unisender/email, Turnstile, Google integrations, Yandex integrations, failed lead submissions, and AI fallback/errors.
Secrets and unnecessary PII must never appear in logs.

## Secrets

The Back Office must show **secret/integration status**, not secret values.
Allowed display: configured/missing, healthy/failing, environment, last check, safe metadata.
Secrets remain in approved environment/platform secret stores and must never be hardcoded, committed, exposed to client JS, written to logs, displayed in admin, or sent to LLMs.

## KokonutUI policy

KokonutUI is treated as a **shop/catalog of ready UX mechanics**. It is not a replacement design system.
Use it to discover AI inputs, action search, tabs, drawers, file upload, loaders, bento layouts, toolbars, selective liquid-glass surfaces, and restrained motion.
Workflow: **browse → shortlist 1–3 → explain benefit/dependencies → Victor chooses → install/adapt → verify accessibility/mobile.**
Every selected component must be adapted to the existing Victor AI Portfolio design tokens. No visual-system mixing.

## MCP

### KokonutUI
KokonutUI works through the shadcn MCP server and is approved for Claude Code and Codex for discovery, source/dependency inspection, and approved installation.

### Back Office MCP
No Back Office MCP is currently enabled.
A third-party Back Office MCP integration may be evaluated after the Back Office exists and has robust auth.
Any such integration must expose only approved data, enforce permissions, use field allowlists, protect tokens/secrets, audit writes, and require approval for destructive/high-risk actions.

## Current sequencing

1. Complete/accept AI Consultant.
2. Add persistent Lead Intelligence storage.
3. Build custom Back Office MVP on Astro + React.
4. Add funnels/email/inbox.
5. Add SEO/Search Console.
6. Add Yandex Metrika / Direct attribution.
7. Add logs/health/integration status.
8. Add AI analytics/SEO/advertising assistants under approval rules.

Implementation occurs phase-by-phase only after explicit approval.
