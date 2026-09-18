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

Also verify:
- desktop/mobile;
- light/dark themes;
- keyboard navigation;
- internal routes;
- CTA flow;
- form/Telegram/email fallback;
- no horizontal overflow;
- no obvious 404/dead links.

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
