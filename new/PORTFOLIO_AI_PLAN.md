# PLAN.md — Victor AI Portfolio: AI Sales & Lead Intelligence System

## 1. Project identity

This is Victor's real commercial website-portfolio.

It is NOT an educational site. PLAAN Academy materials are used only as a methodology for checking information architecture and user journeys.

The strategic goal is broader than a portfolio:

**Portfolio + AI consultant + lead qualification + lead intelligence + CRM context + funnels + lead magnets + email/Telegram follow-up + inbox assistant + analytics.**

## 2. Main business goal

The site must:
1. explain what Victor does;
2. prove competence through real projects;
3. understand visitor intent from lawful first-party behavior and voluntarily provided data;
4. qualify and segment leads;
5. guide visitors into the right CTA, lead magnet, brief or contact flow;
6. create a concise lead profile for Victor;
7. trigger appropriate follow-up;
8. support email campaigns and inbox triage.

Final business outcome:

**qualified lead → useful context → next-best action → conversation → deal.**

## 3. Core AI agents

### Visitor Intent Agent
Uses first-party page views, project/service views, clicks, CTA interactions, UTM/source, chat/form responses and repeat-session context where permitted.

Outputs:
- current interest;
- likely intent stage;
- relevant project/service;
- next-best CTA.

### Lead Qualification Agent
Builds a business lead profile only from lawful/voluntary data:
- name/contact if provided;
- company/role if provided;
- business area;
- task/problem;
- desired outcome;
- urgency;
- budget range if voluntarily supplied;
- preferred contact channel;
- viewed projects/services.

Outputs:
- lead summary;
- qualification status;
- recommended service;
- next-best action.

### AI Consultant
- answers questions;
- asks qualifying questions;
- recommends relevant cases;
- guides to brief/contact;
- prepares a structured handoff for Victor.

### Lead Intelligence / CRM Agent
Unifies website, form, AI chat, Telegram, email and CRM history into a single lead timeline and avoids duplicates.

### Funnel & Lead Magnet Agent
Selects lead magnets and CTA based on intent:
- mini-audit;
- checklist;
- case study;
- AI-readiness assessment;
- automation opportunity map;
- estimate questionnaire;
- demo booking;
- project brief.

### Email Campaign Agent
- segmentation;
- welcome/nurture sequences;
- personalized follow-up;
- re-engagement;
- unsubscribe/consent-aware sending.

### Inbox Agent
For Victor's authorized mailbox:
- classify incoming messages;
- detect leads/support/spam/urgent;
- summarize;
- draft replies;
- auto-send only within explicitly approved low-risk rules;
- escalate uncertain/high-value messages.

### Analytics Agent
- intent trends;
- funnel performance;
- drop-off;
- high-intent leads;
- popular projects/services;
- recommendations for next content/funnel changes.

## 4. Privacy/data boundary

Allowed:
- visitor-provided data;
- first-party site behavior;
- forms;
- AI chat;
- authorized Telegram/email/CRM data;
- lawful transparent enrichment specifically approved later.

Not allowed:
- hidden sensitive profiling;
- inferring health, political views, religion, sexual orientation, race/ethnicity or other sensitive traits from behavior;
- private account scraping;
- invasive fingerprinting by default;
- hidden email subscription;
- client-side storage of secrets.

Build useful business profiles, not invasive dossiers.

## 5. Main user journeys

### A — Visitor knows the problem
Home → direction → case → work format → AI consultant/brief → contact → qualification → follow-up.

### B — Visitor checks competence
Home → projects → case → proof → similar solution → brief/contact → lead card → next action.

### C — Visitor does not know the solution
Home → “What do you want to simplify?” → AI consultant → clarification → recommended format → lead magnet/brief → contact.

### D — Returning lead
Return visit → permitted first-party context → relevant content → personalized CTA → follow-up.

## 6. Portfolio structure principle

Do not create pages mechanically.

Create a page only if:
- there is enough content;
- it serves a distinct scenario/audience;
- it improves navigation or conversion.

Current likely core:
- `/`
- `/projects/`
- `/projects/[slug]/`
- `/privacy/`
- `/404`

Potential future pages only when justified:
- `/services/`
- `/ai-agents/`
- `/about/`
- `/contact/`
- `/resources/`
- `/blog/`

## 7. Product priorities

### P0 — Conversion
- working lead form;
- Telegram/email fallback;
- clear success state;
- no dead ends;
- pass relevant case/service context into lead flow.

### P1 — AI lead intelligence foundation
- event taxonomy;
- session/lead IDs;
- consent-aware first-party analytics;
- unified lead schema;
- AI consultant handoff;
- lead qualification;
- UTM/source capture.

### P1 — Portfolio clarity
- clear Hero;
- real cases;
- clear work formats;
- completed About section;
- no fake blog;
- honest project statuses.

### P2 — Funnels
- lead magnets;
- segmented CTA;
- nurture sequences;
- email follow-up.

### P2 — Inbox automation
- email connector;
- classification;
- draft replies;
- approval rules;
- low-risk auto-send only where explicitly approved.

## 8. Minimum lead profile

- lead_id
- session_id
- source / utm
- first_seen / last_seen
- pages_viewed
- projects_viewed
- services_interested
- CTA history
- form answers
- chat summary
- provided name/email/telegram
- provided company/role
- provided task/problem
- urgency
- voluntary budget range
- qualification status
- recommended service
- lead score
- next_best_action
- consent flags
- email subscription status

## 9. Event taxonomy

Examples:
- page_view
- project_view
- service_view
- ai_consultant_open
- ai_consultant_message
- lead_magnet_view
- lead_magnet_submit
- brief_start
- brief_complete
- contact_click
- telegram_click
- email_click
- lead_form_start
- lead_form_submit
- lead_form_success
- lead_form_error
- case_cta_click
- returning_session
- unsubscribe

No invasive fingerprinting.

## 10. Architecture direction

Visitor
→ consent / first-party event capture
→ website interaction layer
→ AI consultant / forms
→ lead normalization
→ qualification
→ CRM/lead store
→ funnel selection
→ email/Telegram follow-up
→ Victor dashboard/summary
→ inbox agent
→ analytics agent

## 11. Engineering workflow

1. Audit current implementation.
2. Preserve working UX, SEO, accessibility and case pages.
3. Define event taxonomy and lead schema.
4. Stabilize lead/contact infrastructure.
5. Add AI consultant handoff.
6. Add qualification logic.
7. Add lead intelligence storage.
8. Add funnel/lead magnet system.
9. Add email automation.
10. Add inbox assistant.
11. Add analytics/dashboard.
12. Test mobile/desktop/themes/accessibility.
13. Update documentation.
14. No deploy without Victor's explicit approval.

## 12. Definition of done

- visitor understands what Victor does;
- cases prove competence;
- every key section has a next step;
- lead/contact flow works;
- AI consultant can qualify and summarize leads;
- lawful first-party behavior is captured transparently;
- lead data is unified;
- funnels adapt to declared/observed interest;
- email follow-up respects consent;
- inbox automation has approval boundaries;
- Victor receives a useful lead summary;
- privacy/consent is real, not decorative;
- no hidden sensitive profiling;
- project remains maintainable and documented.
