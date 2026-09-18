# AGENTS.md — Victor AI Portfolio

## 1. Project identity

This is Victor's real commercial AI portfolio and client acquisition platform.

It is NOT a classroom exercise.

PLAAN Academy materials are reference methodology only.

## 2. Writable project

Primary writable directory:

`C:\OSPanel\home\victor-ai-portfolio`

Do not modify without explicit instruction:
- `D:\AI Workflows\victor-ai-portfolio`
- `C:\OSPanel\home\myportfoliowebsite`
- `D:\Server OSP\myportfoliowebsite`

The old `myportfoliowebsite` may be inspected only as a donor of proven functionality.

## 3. Mandatory reading before substantial changes

Read:
- `AGENTS.md`
- `PLAN.md`
- `README.md`
- `TZ_SITE_PORTFOLIO.md`
- `VICTOR_AI_PORTFOLIO_MASTER_BRIEF_v2.md`
- `DEVELOPMENT.md`
- `P0_EMAIL_SETUP.md`
- relevant `src/`, `server/`, `public/`, config files

Do not replace detailed existing documentation with shorter versions. Merge useful information.

## 4. Product goal

The target system is:

**portfolio + AI consultant + lead qualification + lead intelligence + funnels + lead magnets + email/Telegram follow-up + inbox assistant + analytics.**

Do not optimize only for appearance.

Every substantial change should improve at least one of:
- visitor understanding;
- proof of competence;
- next action;
- lead capture;
- qualification;
- follow-up;
- maintainability.

## 5. Privacy/data boundary

Allowed:
- visitor-provided data;
- first-party page/click/form/chat events;
- authorized Telegram/email/CRM data;
- lawful transparent enrichment specifically approved later.

Not allowed:
- hidden profiling of sensitive traits;
- inferring sensitive characteristics from browsing behavior;
- scraping private accounts;
- invasive browser fingerprinting by default;
- storing secrets client-side.

Minimize data collection.

## 6. Lead intelligence

Build useful business lead profiles, not invasive dossiers.

A lead profile may include:
- provided identity/contact;
- provided company/role;
- task/problem;
- viewed projects/services;
- source/UTM;
- chat/form summary;
- urgency;
- voluntary budget;
- qualification status;
- recommended next action;
- consent/subscription state.

Never invent facts about a visitor.

## 7. AI consultant

Should:
- answer using real portfolio/services;
- ask concise qualifying questions;
- recommend relevant cases;
- guide to brief/contact;
- create a structured internal lead summary.

Must not:
- invent capabilities;
- promise unsupported outcomes;
- expose secrets;
- fabricate pricing/timelines;
- collect unnecessary personal data.

## 8. Email/inbox automation

Allowed:
- classify;
- summarize;
- draft;
- segment;
- prepare sequences;
- auto-send only within explicitly approved low-risk rules.

Human approval required for:
- legal/financial commitments;
- unusual commercial offers;
- high-value negotiations;
- ambiguous complaints;
- sensitive/confidential topics.

Respect consent, unsubscribe, sender reputation and applicable marketing/privacy requirements.

## 9. Funnels and lead magnets

Use:
- declared interest;
- lawful first-party behavior;
- current funnel stage.

No dark patterns.

Lead magnets must provide real value.

## 10. Engineering rules

- Do not rewrite the site without necessity.
- Preserve working cases, themes, accessibility, SEO and existing lead infrastructure.
- Reuse proven components before creating duplicates.
- No hardcoded secrets.
- Validate inputs server-side.
- Keep provider/API calls server-side.
- Use env/config for endpoints.
- Avoid duplicate analytics events.
- Document event names.
- Prefer idempotent backend actions.
- Preserve error/fallback paths.

## 11. Testing

After structural changes run at minimum:
- `npm run check`
- `npm run build`
- relevant worker/form tests if present
- Back Office pages load (`/admin/dashboard/`, `/admin/leads/`, etc.) if Back Office touched.

Also verify:
- desktop/mobile;
- light/dark themes;
- keyboard navigation;
- internal routes;
- CTA flow;
- form/Telegram/email fallback;
- no horizontal overflow;
- no obvious 404/dead links;
- Back Office auth guard works (redirects to login when not authenticated).

## 12. Documentation

Update `README.md` and `PLAN.md` when architecture or user journeys change.

Merge; do not overwrite useful history.

## 13. Git/deployment restrictions

Without explicit Victor approval:
- no commit;
- no push;
- no deploy;
- no remote changes;
- no destructive cleanup.

## 14. Completion rule

Do not say DONE unless:
- requested scope is implemented;
- tests/checks passed or limitations are stated;
- no secrets were exposed;
- user journey remains functional;
- documentation is updated where needed.

## 15. Final report

Keep it short:
- changed files;
- what changed;
- tests/checks;
- known limitations;
- what remains manual;
- confirm no commit/push/deploy.

## Visual system rules

The project must use one coherent visual system.

Allowed inspiration and component sources:
- KokonutUI
- liquid glass / glassmorphism
- Stripe-like animated backgrounds
- dashboard and data-visualization components
- restrained Awwwards-style scroll interactions

Reference:
https://kokonutui.com/docs/cards/card-flip

Rules:
1. Do not mix unrelated visual systems.
2. Adapt external components to the existing design tokens.
3. Reuse current typography, spacing, radius, shadows, gradients and motion timing.
4. Prefer one dominant visual effect per section.
5. Do not stack glass + glow + parallax + particles + flip + 3D in one block.
6. Animations must support comprehension, hierarchy or conversion.
7. Mobile UX must never depend on hover.
8. Respect prefers-reduced-motion.
9. Dashboards must use the same visual language as the rest of the site.
10. Do not add another CSS/design system without explicit approval.
11. If a new library conflicts with the current visual language, stop and explain before implementation.
12. Components from KokonutUI or other libraries must be adapted, never pasted unchanged.

## Architecture boundary

Primary public frontend remains Astro/React unless Victor explicitly approves a migration.
The internal Back Office lives on the same Astro + React stack as the public site.
Expected boundary: `Astro public frontend → API/Worker/server → persistent data store → Astro/React Back Office`.
Never couple public rendering to Back Office internals.

## Back Office scope

Planned modules when approved:
- Dashboard
- Leads / Contacts / Companies
- AI Conversations
- Projects / Cases
- Services / Work Formats
- Funnels / Lead Magnets
- Email / Inbox
- Analytics / Attribution
- SEO / Search Console
- Yandex Metrika
- Yandex Direct
- optional Google Ads
- Logs / Health
- Integrations
- Secrets status
- Environment status
- Settings
- Permissions
- Audit history

Do not build all modules at once. Implement only the explicitly assigned phase.

## Back Office mechanics (Astro + React)

Prefer proven internal-admin UX patterns adapted from Django Admin: tables with sortable columns, filters, search, detail pages, inline related data, read-only system fields, form validation, permissions, change history awareness.
Do not expose data merely because it exists. System/provenance fields default to read-only.

## Secrets rules

Never expose raw secrets in Back Office.
Back Office may show only configured/missing, healthy/failing, environment, last check, safe metadata.
Never display/store/log API keys, private keys, passwords, bearer tokens, refresh tokens.
Never hardcode secrets, put them in client bundles, commit them, write them into README/PLAN/AGENTS, or send them to LLMs.
Use environment/platform secret stores.

## Logs / observability

Do not log raw secrets, complete system prompts, unnecessary full PII, or full chat history by default.
Logs must be bounded, access-controlled, useful for debugging/health, and retention-aware.

## SEO / Search rules

SEO systems may ingest technical page metadata, indexing state, sitemap/robots/canonical, 404/redirect data, and Google Search Console query/page metrics.
AI SEO recommendations are advisory unless publishing is explicitly approved.
Never auto-publish SEO/content changes without an approved workflow.
Do not fabricate Search Console or ranking data.

## Advertising / attribution rules

Planned integrations: Yandex Metrika, Yandex Direct, optional Google Ads.
Evaluate advertising by business outcomes, not clicks alone.
Prefer `campaign → visitor → lead → qualification → outcome`.
Never invent campaign data, cost, conversions, or ROI.
Do not change ad budgets/campaign settings without explicit approval.

## KokonutUI policy

KokonutUI is a **store/catalog of ready UX mechanics**, not a design system.
Allowed use: discover components, inspect code/dependencies, compare mechanics, reuse selected interaction patterns.
Examples: AI prompt/input, action search, tabs, drawers, upload, loaders, bento mechanics, toolbar, selective liquid-glass surfaces, restrained motion.

Mandatory workflow:
1. Search/browse KokonutUI.
2. Present 1–3 candidates.
3. Explain UX benefit, dependencies, accessibility implications.
4. Wait for Victor's explicit choice.
5. Only then install/adapt.
6. Adapt to existing design tokens.
7. Preserve mobile, keyboard, reduced-motion and accessibility.
8. Do not mix visual systems.
9. Do not install decorative effects without functional value.
10. Do not introduce a second CSS/design system.

Never automatically install KokonutUI components merely because MCP can.

## MCP rules

### shadcn/KokonutUI MCP
Approved for Claude Code and Codex for discovery and approved installation only.
It is not permission to mutate UI without approval.

### Back Office MCP
No Back Office MCP is currently enabled.
A third-party MCP server may be evaluated only after the Back Office exists and has robust auth.
Before enabling: review package/repository, pin version, verify authentication, expose only approved data, use field allowlists/excludes, respect permissions, start read-only where practical, do not expose secrets/integration credential data, audit MCP writes, require explicit approval for delete/bulk/high-risk actions.
Never grant an AI agent unrestricted Back Office access.

## Data / privacy

Allowed: visitor-provided data, consent-aware first-party events, authorized email/Telegram/CRM data, aggregate SEO/marketing data, lawful approved integration data.
Not allowed: sensitive-trait inference, private account scraping, invasive fingerprinting, covert persistent identity, secret collection in browser, treating AI summaries as verified personal facts.

## Development safety

Before changes: inspect current implementation, reuse existing modules, avoid duplicate analytics/consent systems, avoid unnecessary dependencies.
After changes: run relevant tests, `npm run check`, `npm run build`, server tests, and visually verify when UI changed.
Do not commit, push, merge, deploy, change external accounts, rotate secrets, or modify advertising without Victor's explicit approval.

## Completion report

For every substantial task report: files changed, behavior implemented, data source, security/privacy implications, env/secrets required, tests/results, manual checks, known limitations, next recommended step.
Never claim a live integration works unless it was actually tested.

If Back Office was changed, additionally report:
- pages/components added/modified;
- admin layout/auth changes;
- data layer changes;
- localStorage schema changes;
- Astro build results.
