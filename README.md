# victor-ai-portfolio

Коммерческий сайт-портфолио Виктора: AI-автоматизация бизнеса, AI-агенты и AI-сервисы.

Продукт эволюционирует в интегрированную коммерческую систему:
**Portfolio + AI Consultant + Lead Intelligence + Qualification + Back Office + Funnels + Email/Inbox + SEO/Search + Advertising + Analytics + Observability.**

## Текущая цель

Довести сайт до состояния, в котором ссылку можно отправлять потенциальному клиенту без пояснений и без неработающих элементов.

Главный пользовательский результат:

> Посетитель понимает, какую задачу можно решить, видит подтверждённый похожий кейс и может сразу получить предварительную оценку или связаться.

Подробный продуктовый план: `PLAN.md`.

## Приоритеты доработки

### Шаг 1. Сделать рабочую конверсию — P0
- [x] Подключить реальную ссылку Telegram.
- [x] Реализовать форму заявки и брифа (LeadForm + lead-worker).
- [x] Добавить success/error состояния форм.
- [x] Проверить CTA на всех ключевых экранах.
- [x] Заменить основной CTA на «Получить предварительную оценку проекта».
- [ ] Для рабочей отправки: настроить env `PUBLIC_LEAD_ENDPOINT`, `PUBLIC_TURNSTILE_SITE_KEY`, `PUBLIC_LEAD_CONSENT_CONFIRMED` и секреты Worker (`RESEND_API_KEY`, `MAIL_FROM`, `TURNSTILE_SECRET_KEY`).
- [x] Back Office: собственная панель на Astro + React + Tailwind, localStorage MVP.

### Шаг 2. Сфокусировать позиционирование — P1
- [x] Оставить на первом плане 3 направления:
  - AI-автоматизация бизнеса;
  - AI-агенты;
  - AI-сервисы и приложения.
- [x] «Сайты и веб-системы» перенести во вторичную компетенцию.
- [x] Переписать hero без перечисления слишком большого числа услуг.

### Шаг 3. Доработать доверие — P1
- [x] Заполнить раздел «Обо мне» 4–6 конкретными предложениями.
- [x] Не добавлять неподтверждённые годы опыта, числа клиентов или результаты.
- [x] Для всех кейсов использовать одинаковую структуру:
  1. задача;
  2. что сделали;
  3. как работает;
  4. результат;
  5. доказательства;
  6. ограничения;
  7. что можно сделать похожего;
  8. CTA.

### Шаг 4. Добавить коммерческий ориентир — P1
- [x] Создать блок «Форматы работы».
- [x] Без выдуманных цен: для каждого формата указано, кому подходит и что получает клиент.
- [x] Объяснён принцип оценки: после короткого брифа — предварительная оценка, состав работ и следующий шаг.

### Шаг 5. Убрать ощущение незавершённости — P2
- [x] Скрыть «Блог» из меню и главной. Код сохранён.
- [x] Убрать формулировки «готовится к подключению», «пока доступен пример».
- [x] Убрать footer «Первая версия · в разработке».
- [x] Проверить, что нет пустых или служебных текстов (privacy policy заполнена, footer обновлён).

### Шаг 6. AI-консультант — P2 (done)
- [x] Добавить AI-консультанта на главную страницу.
- [x] Консультант отвечает на вопросы о реальных проектах и услугах.
- [x] Помогает сформулировать бизнес-задачу и задаёт уточняющие вопросы.
- [x] Рекомендует только реальные кейсы и форматы работы.
- [x] Готовит структурированный handoff в LeadForm.
- [x] UI: компактный bubble, mobile-first, доступность (keyboard, focus, aria, reduced-motion).
- [x] Server-side LLM с provider abstraction, ключ не в браузере, fallback при отсутствии конфигурации.
- [x] Сессионная история чата, нет персистентного профиля.
- [x] Интеграция с LeadForm: visible prefill, пользователь может редактировать.
- [x] События: `ai_consultant_open`, `ai_consultant_message`, `ai_consultant_error`, `ai_consultant_handoff`.
- [ ] Локальная приёмка с реальным LLM (P2.1) — llama3.1:8b-8k через Ollama, endpoint работает, fallback работает, handoff работает; для production рекомендуется более мощная модель (GPT-4o-mini или аналог).

## Карта сайта

### `/`
Главная страница.

Задача:
- объяснить предложение;
- показать 3 направления;
- показать сильные кейсы;
- объяснить процесс;
- привести к оценке проекта.

Следующий шаг:
- «Получить предварительную оценку проекта».

### `/projects/`
Каталог подтверждённых проектов.

Следующий шаг:
- открыть релевантный кейс.

### `/projects/[slug]/`
Страница кейса.

Следующий шаг:
- «Получить оценку похожего проекта».

### `/brief/` или встроенный рабочий бриф
Собирает первичную информацию.

Следующий шаг:
- отправить заявку;
- открыть Telegram как альтернативу.

### «Форматы работы»
Секция на главной.

Назначение:
- объяснить варианты сотрудничества;
- помочь выбрать подходящий формат;
- привести к заявке.

### Контакт
Блок на главной + fallback в формах.

Обязательно:
- рабочий Telegram;
- рабочая форма;
- понятный следующий шаг после отправки.

### «Обо мне»
Секция на главной.

### Блог
Скрыт до появления реальных публикаций. Код сохранён.

## Основной путь пользователя

### Маршрут А — клиент знает проблему
`Главная → направление → релевантный кейс → Форматы работы → предварительная оценка → Telegram/форма`

### Маршрут Б — клиент проверяет компетенции
`Главная → Проекты → кейс → доказательства → «Сделать похожее решение» → форма/Telegram`

### Маршрут В — клиент пока не знает решение
`Главная → «Что хотите упростить?» → короткий бриф → рекомендация формата → контакт`

Не должно быть тупиков.

## Требования env для рабочего lead flow

Для отправки форм и брифа через сайт необходимо:

**При сборке сайта:**
- `PUBLIC_LEAD_ENDPOINT` — HTTPS URL Worker'а для форм (например, `https://worker.example.workers.dev/api/leads`)
- `PUBLIC_CONSULT_ENDPOINT` — HTTPS URL Worker'а для AI-консультанта (например, `https://worker.example.workers.dev/api/consult`)
- `PUBLIC_TURNSTILE_SITE_KEY` — публичный ключ Cloudflare Turnstile
- `PUBLIC_LEAD_CONSENT_CONFIRMED=true` — после утверждения privacy

**В Cloudflare Worker (`server/lead-worker.mjs`):**
- `RESEND_API_KEY` — API-ключ Resend
- `MAIL_FROM` — подтверждённый адрес отправителя
- `TURNSTILE_SECRET_KEY` — секретный ключ Turnstile
- `ALLOWED_ORIGINS` — разрешённые origins через запятую
- `LEAD_CONSENT_CONFIRMED=true` — после утверждения privacy
- `LLM_API_KEY` — API-ключ LLM-провайдера для AI-консультанта
- `LLM_PROVIDER_URL` — URL LLM endpoint (опционально, default OpenAI)
- `LLM_MODEL` — модель (опционально, default `gpt-4o-mini`)

Без этих переменных формы и консультант показывают fallback на Telegram и email.

## Контентные правила

1. Не выдумывать кейсы.
2. Не выдумывать отзывы.
3. Не выдумывать метрики.
4. Не выдумывать стаж или число клиентов.
5. Отделять прототип, demo и production.
6. Сначала объяснять пользу для бизнеса, потом технологии.
7. На каждой ключевой странице должен быть один понятный следующий шаг.

## Основной CTA

Предпочтительный вариант:

**Получить предварительную оценку проекта**

Поддерживающий текст:

**Опишите задачу — после короткого брифа определим подход, объём и следующий шаг.**

Дополнительный CTA:

**Посмотреть реальные кейсы**

## Definition of Done

Перед публикацией:

- [x] Telegram работает (реальная ссылка).
- [x] LeadForm UI и fallback на Telegram/email работают. Production delivery требует настройки PUBLIC_LEAD_ENDPOINT и Worker secrets (RESEND_API_KEY, MAIL_FROM, TURNSTILE_SECRET_KEY).
- [x] Бриф работает (встроен в LeadForm).
- [x] «Обо мне» заполнен.
- [x] Позиционирование сфокусировано.
- [x] Кейсы унифицированы.
- [x] Есть блок форматов работы.
- [x] Блог скрыт или наполнен.
- [x] Нет заглушек коммерческого функционала (privacy заполнена).
- [ ] Все CTA проверены (вручную).
- [ ] Все ссылки проверены (вручную).
- [ ] Desktop проверен (вручную).
- [ ] Tablet проверен (вручную).
- [ ] Mobile проверен (вручную).
- [ ] Светлая тема проверена (вручную).
- [ ] Тёмная тема проверена (вручную).
- [x] `npm run check` проходит.
- [x] `npm run build` проходит.
- [x] Back Office страницы собираются.
- [ ] Выполнена финальная визуальная приёмка.

## Рабочее правило

Изменения выполнять поэтапно. Не делать большой несфокусированный редизайн. Сначала закрыть P0, затем P1, затем P2. После каждого этапа — короткая визуальная проверка и только необходимые тесты.

## Back Office (собственный, на Astro + React + SQLite)

Внутренняя панель управления построена на том же стеке, что и публичный сайт: **Astro + React islands + Tailwind CSS**. Django использован только как reference для UX/admin-механик (tables, filters, search, detail, readonly fields, permissions).

### Реализовано
- **Dashboard** — stats cards, последние лиды (из SQLite).
- **Leads** — таблица с server-side search, filters (status), sort. Detail page с readonly fields.
- **AI Conversations** — список диалогов с AI Consultant, handoff summary (из SQLite).
- **SEO** — статический анализ + server-side page_seo_state.
- **System** — integration status (SQLite), health indicators, logs (SQLite).
- **Auth** — server-side username/password, scrypt hash with salt + timing-safe compare, HttpOnly SameSite Secure cookie, SQLite sessions.

### Pages
- `/admin/login/` — вход (username + password → server)
- `/admin/dashboard/` — обзор
- `/admin/leads/` — список лидов
- `/admin/leads/[id]/` — деталь лида
- `/admin/conversations/` — AI-диалоги
- `/admin/seo/` — SEO-анализ
- `/admin/system/` — система и интеграции

### Data layer (SQLite via `node:sqlite`)
- `src/lib/db.ts` — DatabaseSync с таблицами: sessions, leads, conversations, system_logs, audit_events, integration_status, page_seo_state.
- LeadForm → Worker → ingestion endpoint `/api/ingest/` → SQLite.
- AI Consultant → сохраняет conversation при handoff.
- **Примечание**: для production заменить на PostgreSQL/Cloudflare D1.

### API routes (`src/pages/api/`)
- `POST /api/auth/login/` — проверка username/password, создание сессии, установка cookie.
- `POST /api/auth/logout/` — удаление сессии, очистка cookie.
- `GET /api/auth/check/` — проверка валидности сессии.
- `POST /api/ingest/` — ingestion от Worker, Bearer token auth, dedup по lead_id.
- `GET /api/leads/` — список лидов (search, filter, sort) + GET by id + DELETE.
- `GET /api/conversations/` — список диалогов.
- `GET /api/system/` — интеграции + логи.
- `GET /api/seo/` — страницы SEO.

### Env Back Office
- `ADMIN_USERNAME` — имя администратора.
- `ADMIN_PASSWORD_HASH` — scrypt hash пароля (генерируется через `node -e "const {scryptSync,randomBytes}=require('crypto');const s=randomBytes(32);console.log(s.toString('hex')+':'+scryptSync('your-password',s,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex'))"`).
- `INGEST_TOKEN` — Bearer token для `/api/ingest/`.

### Production server
- `npm run build` создаёт Node server в `dist/server/entry.mjs` через `@astrojs/node` (standalone mode).
- Запуск: `PORT=4321 node dist/server/entry.mjs` (или через `pm2`, `systemd` и т.д.).
- Все `/admin/*` страницы защищены server-side: без valid session происходит redirect на `/admin/login/`.
- API routes требуют valid session cookie для всех приватных эндпоинтов.

## Back Office & Growth Operations Vision

The public site remains customer-facing. The Back Office becomes Victor's internal operating system for leads, content, marketing, AI and technical health.

**Реализовано сейчас:** Dashboard, Leads, AI Conversations, SEO, System — на Astro + React + Tailwind + SQLite server-side.

### Back Office target sections

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

### Back Office role

The Back Office is built on the same Astro + React + Tailwind stack as the public site.
Django is used only as a **reference** for UX/admin mechanics (tables, filters, search, detail, readonly fields, permissions, auditability).

The public Astro site should never be rewritten to another framework merely to obtain an admin panel.

### Marketing / search / attribution

The system should connect traffic to business value:

`Search / Direct / referral / campaign → landing → visitor behavior → AI Consultant → LeadProfile → qualification → follow-up → outcome`

Planned sources: Google Search Console, Yandex Metrika, Yandex Direct, optional Google Ads, first-party events, UTM attribution.

The goal is not just to count traffic/clicks. The goal is to understand which sources produce qualified and high-intent leads.

### Logs / health

The Back Office should expose safe operational status for site, API/Worker, LLM provider, database, Resend/email, Turnstile, Google integrations, Yandex integrations, failed lead submissions, and AI fallback/errors.
Secrets and unnecessary PII must never appear in logs.

### Secrets

The Back Office must show **secret/integration status**, not secret values.
Allowed display: configured/missing, healthy/failing, environment, last check, safe metadata.
Secrets remain in approved environment/platform secret stores and must never be hardcoded, committed, exposed to client JS, written to logs, displayed in admin, or sent to LLMs.

### KokonutUI policy

KokonutUI is treated as a **shop/catalog of ready UX mechanics**. It is not a replacement design system.
Use it to discover AI inputs, action search, tabs, drawers, file upload, loaders, bento layouts, toolbars, selective liquid-glass surfaces, and restrained motion.
Workflow: **browse → shortlist 1–3 → explain benefit/dependencies → Victor chooses → install/adapt → verify accessibility/mobile.**
Every selected component must be adapted to the existing Victor AI Portfolio design tokens. No visual-system mixing.

### MCP policy

**KokonutUI** works through the shadcn MCP server and is approved for Claude Code and Codex for discovery, source/dependency inspection, and approved installation.

**Back Office MCP**: пока НЕ подключать автоматически. Сначала должен существовать полноценный Back Office с robust auth; потом можно оценить third-party MCP. Только allowlisted data, allowlisted fields, permissions, read-only first where possible, no secrets exposed, destructive actions only with approval, audit MCP writes.

### Current sequencing

1. Complete/accept AI Consultant.
2. Add persistent Lead Intelligence storage.
3. Build Back Office MVP on Astro + React.
4. Add funnels/email/inbox.
5. Add SEO/Search Console.
6. Add Yandex Metrika / Direct attribution.
7. Add logs/health/integration status.
8. Add AI analytics/SEO/advertising assistants under approval rules.

Implementation occurs phase-by-phase only after explicit approval.


---

## AI Sales & Lead Intelligence Strategy


## Product vision

Victor AI Portfolio is a real commercial portfolio and client acquisition platform.

It is not a lesson project.

The site should evolve into:

**Portfolio + AI consultant + lead qualification + lead intelligence + funnels + lead magnets + email/Telegram follow-up + inbox assistant + analytics.**

## Main objective

For visitors:
- understand Victor's capabilities;
- see real project proof;
- describe a business problem;
- receive relevant guidance;
- contact Victor;
- enter the correct follow-up path.

For Victor:
- understand leads faster;
- see visitor interest;
- receive structured lead summaries;
- segment leads;
- automate follow-up;
- organize email campaigns;
- monitor and triage incoming email.

## AI agents planned

- Visitor Intent Agent
- Lead Qualification Agent
- AI Consultant
- Lead Intelligence / CRM Agent
- Funnel & Lead Magnet Agent
- Email Campaign Agent
- Inbox Agent
- Analytics Agent

## Data principles

Use only:
- visitor-provided information;
- first-party site behavior;
- forms;
- AI chat;
- authorized Telegram/email/CRM data;
- transparent lawful enrichment if explicitly approved later.

Do not secretly infer or collect sensitive personal traits.

## Main visitor flow

Visitor → relevant content → AI clarification → case/service → brief/contact → qualification → lead card → follow-up → Victor.

## Project locations

Primary writable copy:
`C:\OSPanel\home\victor-ai-portfolio`

Original copied source:
`D:\AI Workflows\victor-ai-portfolio`

Old functional donor:
`C:\OSPanel\home\myportfoliowebsite`

Archive:
`D:\Server OSP\myportfoliowebsite`

Only the primary writable copy should be changed unless Victor explicitly approves otherwise.

## Current strategic priorities

1. Make lead/contact flow reliable.
2. Remove dead ends/placeholders.
3. Preserve real cases and honest project statuses.
4. Add lead intelligence foundation.
5. Add AI consultant qualification/handoff.
6. Add funnels and lead magnets.
7. Add consent-aware email automation.
8. Add inbox triage and drafting.
9. Add analytics for intent/funnel performance.

## P1 — AI Lead Intelligence Foundation (done)

- **Event taxonomy**: 18 typed events in `src/scripts/events.ts`.
- **Session ID**: first-party UUID in `sessionStorage`; no fingerprinting, IP, canvas, fonts or hardware signals; no persistent user ID.
- **UTM/source context**: captured once per session from landing URL; not overwritten on subsequent navigations.
- **URL normalization**: `landing_page`, `current_page`, `referrer`, `pages_viewed` and `CTA_history` store only `origin + pathname`; query and hash are stripped. UTM params are preserved separately in a whitelist.
- **Visitor context**: `session_id`, `first_seen`, `last_seen`, `landing_page`, `current_page`, `referrer`, `UTM`, `pages_viewed`, `projects_viewed`, `services_viewed`, `CTA_history`.
- **LeadForm integration**: visitor context is appended to the form payload; form still works if analytics/session is unavailable.
- **Worker update**: `server/lead-worker.mjs` validates and sanitizes lead context (size limits, array caps, no unexpected fields, URL sanitization), includes useful context in the email to Victor.
- **Tests**: `node --test server/lead-worker.test.mjs` passes (27/27).
- **Reserved events** (no UI yet): `ai_consultant_open`, `ai_consultant_message`, `lead_magnet_view`, `lead_magnet_submit`.
- **Privacy note**: `returning_session` is temporarily disabled until a consent-approved persistent marker is available.

## P1.2 — Lead Profile + Lead Qualification Engine (done)

- **LeadProfile schema** (`server/lead-profile.mjs`): типизированный профиль лида с полями identity, source, behaviour, provided data, qualification, consent.
- **Qualification statuses**: `new`, `incomplete`, `qualified`, `high_intent`, `not_ready`, `needs_review`.
- **Rule-based engine**: deterministic scoring без LLM. Правила основаны на first-party поведении и данных формы. Каждый балл объясним через `score_reasons`.
- **Scoring**: +30 форма с задачей, +20 полный бриф, +15 case CTA, +10 несколько проектов, +10 конкретная задача, +8 услуга, +5 срок, +5 Telegram/contact клик.
- **Integration**: при отправке LeadForm в Worker строится LeadProfile → qualification → summary добавляется в email Виктору.
- **Security**: qualification считается только на сервере; клиент не может подменить score. Engine не использует sensitive traits.
- **Tests**: 27/27 worker tests passed, 15/15 consult-handler tests passed.

## Constraints

- no fake clients/reviews/metrics;
- no hidden sensitive profiling;
- no invasive fingerprinting by default;
- no hardcoded secrets;
- no silent subscription;
- no automatic high-risk email replies;
- preserve prototype/demo/MVP/production truthfulness.

## Documentation

`PLAN.md` — roadmap and target architecture.

`AGENTS.md` — strict rules for AI coding agents.

PLAAN Academy materials are only an information-architecture reference, not the product specification.


## Frontend CTA / visual system (2026-09-18, local)

Canonical public actions use `src/components/Cta.tsx` and `src/styles/cta.css` for both anchors and native submit buttons. A shared animated split boundary clips both surfaces and text layers; dark/light palettes, focus-visible, disabled, forced-colors and reduced-motion are supported. GradientButton is a legacy/deprecated compatibility component; new CTA markup should use Cta. Navigation links remain text. LeadForm updates both label layers without replacing the button markup.

`src/styles/public-visual.css` owns the public ambient violet/cyan gradient and panel glow; shooting stars are preserved as part of the unified public visual system alongside the ambient background. Format-card emblems reuse VMark/icon-host. Back Office, API, auth, database, routes and content are unchanged.

Validation: check/build pass (existing admin unused-import hint and dynamic getStaticPaths build warning); CTA SSR and form-label lifecycle checks pass. Browser visual acceptance remains manual because the browser runtime could not load. No commit, push or deploy.


### Homepage project carousel (2026-09-18, local)

The homepage now renders all eight projects from `src/data/projects.ts`, ordered LeadFlow, Content Factory, Travel, KMK, donskoe39, Leftover Food, FairyTales, Catch Job. It reuses the `/projects/` CarouselControls, data attributes, responsive horizontal scroll/snap, swipe and keyboard handlers. Project data, cards, CTA, background and backend are unchanged. Check/build pass with existing diagnostics; browser interaction acceptance remains manual. No commit/push/deploy.
