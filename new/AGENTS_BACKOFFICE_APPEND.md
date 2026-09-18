# Victor AI Portfolio — Back Office / MCP Agent Rules Addendum

> Merge this section into AGENTS.md. These are mandatory rules for Claude Code, Codex, and other coding agents working on Victor AI Portfolio.

## Product identity

This is Victor's real commercial AI portfolio and client acquisition/operations platform.
Target product: **public portfolio + AI sales layer + Lead Intelligence + Back Office + SEO/Search + Advertising + Analytics + Email/Inbox + Observability + Integrations.**
Do not optimize only for appearance.

## Architecture boundary

Primary public frontend remains Astro/React unless Victor explicitly approves a migration.
**Django is reference ONLY for UX/admin mechanics** — it is NOT used in the project.
The Back Office is built on the **same Astro + React + Tailwind stack** as the public site.
Expected boundary: `Astro public frontend → API/Worker/server → SQLite persistent layer → custom Astro/React Back Office`.
Never couple public rendering to Back Office internals.

## Mandatory reading

Read current AGENTS.md, PLAN.md, README.md, VICTOR_AI_PORTFOLIO_MASTER_BRIEF_v2.md, TZ_SITE_PORTFOLIO.md, DEVELOPMENT.md, P0_EMAIL_SETUP.md, and relevant src/, server/, config and tests.
Do not overwrite detailed existing documentation with a shorter rewrite. Merge useful information.

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

## Back Office mechanics (Astro + React + SQLite)

When building Back Office features, prefer proven internal-admin UX patterns adapted from Django Admin: tables with sortable columns, filters, search, detail pages, inline related data, read-only system fields, form validation, permissions, auditability.
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

## AI agents and business data

AI may summarize, classify, score under approved rules, suggest next actions, draft, analyze trends, recommend experiments.
AI must not invent facts, infer sensitive traits, silently subscribe users, auto-send high-risk communications, make financial/legal commitments, modify ad spend, expose secrets, or bypass permissions.
Human approval remains required for high-risk actions.

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
