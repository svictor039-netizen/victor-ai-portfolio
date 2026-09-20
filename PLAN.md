# PLAN.md — коммерческая доработка сайта-портфолио Виктора

Дата: 09.09.2026
Сайт: https://victor-ai-portfolio.svictor-039.chatgpt.site

## 1. Цель доработки

Довести текущий сайт-портфолио до коммерчески готового состояния, чтобы потенциальный клиент:

1. за 5–10 секунд понимал, чем занимается Виктор;
2. узнавал, какие бизнес-задачи можно решить;
3. видел реальные подтверждённые проекты;
4. понимал, какой следующий шаг сделать;
5. мог сразу связаться или оставить заявку;
6. не сталкивался с пустыми, планируемыми или неработающими разделами.

Главная задача сайта:

> Получать целевые обращения на разработку AI-агентов, AI-автоматизацию и AI-сервисы, подтверждая компетенции реальными кейсами.

## 2. Проверка по требованиям урока

### 2.1. Главная задача сайта
Статус: ЧАСТИЧНО ВЫПОЛНЕНО.

Плюсы:
- на первом экране сразу видны AI-агенты, AI-сервисы, сайты и автоматизация;
- есть понятная формулировка «От идеи до работающего AI-продукта»;
- есть CTA «Обсудить задачу».

Что мешает:
- слишком много равноправных направлений;
- целевой клиент сформулирован недостаточно точно;
- основной коммерческий результат сайта не доведён до работающего контакта/заявки.

### 2.2. Список страниц
Статус: ВЫПОЛНЕНО.

Сейчас есть:
- Главная;
- Проекты;
- отдельные страницы кейсов;
- разделы/якоря «AI-агенты», «Услуги», «Процесс», «Форматы работы», «Обо мне», «Контакт».
- Блог скрыт до появления реальных публикаций.

Финальная карта сайта зафиксирована.

### 2.3. Назначение каждой страницы
Статус: ВЫПОЛНЕНО.

Главная знакомит и продаёт подход.
Проекты подтверждают компетенции.
Кейсы раскрывают решение и доказательства.
Услуги показывают форматы помощи.
Форматы работы объясняют варианты сотрудничества.
Бриф собирает первичную информацию.
Контакты дают реальные способы связи.

Недоработки:
- «Блог» скрыт до появления реальных публикаций;
- Для рабочей отправки форм требуется настройка env и секретов Worker.

### 2.4. Следующий шаг с каждой ключевой страницы
Статус: ВЫПОЛНЕНО.

Кнопки есть и ведут к реальным действиям:
- Telegram подключён и работает;
- форма и бриф реализованы с fallback на Telegram/email;
- после отправки — понятный success с ожиданием ответа.

Для автоматической отправки через сайт требуется настройка env и секретов Worker.

### 2.5. Основной путь посетителя
Статус: ВЫПОЛНЕНО.

Маршрут А — клиент знает проблему:
Главная → направление → релевантный кейс → Форматы работы → предварительная оценка → Telegram/форма.

Маршрут Б — клиент проверяет компетенции:
Главная → Проекты → кейс → доказательства → «Сделать похожее решение» → форма/Telegram.

Маршрут В — клиент пока не знает решение:
Главная → «Что хотите упростить?» → короткий бриф → рекомендация формата → контакт.

Путь завершается реальным способом связи (Telegram, email, форма с fallback).

## 3. Что уже сделано хорошо

- Позиционирование сфокусировано на 3 направлениях.
- Есть реальные проекты, а не только список технологий.
- В кейсах присутствуют доказательства и ограничения.
- Нет выдуманных метрик там, где их нельзя подтвердить.
- Услуги описаны через бизнес-задачи.
- Процесс работы понятен.
- Есть блок «Форматы работы» с вариантами сотрудничества.
- «Обо мне» заполнен конкретными предложениями.
- Есть акцент на задаче клиента, а не только на технологиях.
- Есть отдельные страницы проектов.
- Дизайн и структура дают хорошую основу для коммерческой версии.

## 4. Главные проблемы

### P0 — для полной конверсии требуется
1. Настроить env `PUBLIC_LEAD_ENDPOINT`, `PUBLIC_TURNSTILE_SITE_KEY` и секреты Worker (`UNISENDER_API_KEY`, `TURNSTILE_SECRET_KEY`).

### P1 — выполнено
2–9. Позиционирование, форматы работы, структура кейсов, «Обо мне» — доработаны.

### P2 — выполнено
10. Блог скрыт из навигации и главной.
11. Структура кейсов унифицирована.
12. Карта сайта и пользовательские маршруты зафиксированы.

## 5. Новое позиционирование

### Основные направления
На первом плане оставить три направления:

1. AI-автоматизация бизнеса.
2. AI-агенты.
3. AI-сервисы и приложения.

«Сайты и веб-системы» оставить как дополнительную компетенцию/формат реализации, а не равноправный главный продукт.

### Целевой клиент
Базовая формулировка:

> Малый и средний бизнес, экспертные и сервисные команды, у которых есть повторяющиеся процессы, большое количество обращений/документов или ручная работа, которую можно упростить с помощью AI и автоматизации.

Не перечислять на первом экране десятки отраслей и ролей.

## 6. Финальная карта сайта

### 1. Главная `/`
Назначение:
- быстро объяснить позиционирование;
- показать 3 основных направления;
- показать 3–4 сильных кейса;
- объяснить процесс;
- дать ориентиры по формату работы;
- привести к заявке.

Следующий шаг:
- «Получить предварительную оценку проекта»;
- «Посмотреть кейсы».

### 2. Проекты `/projects/`
Назначение:
- доказать опыт;
- помочь найти похожую задачу.

Следующий шаг:
- открыть кейс;
- после просмотра — перейти к оценке похожей задачи.

### 3. Кейс `/projects/[slug]/`
Назначение:
- показать задачу, решение, механику, результат и доказательства.

Обязательная структура:
1. Задача.
2. Что сделали.
3. Как работает.
4. Результат.
5. Доказательства.
6. Ограничения/статус.
7. Что можно сделать аналогичного для клиента.
8. CTA.

Следующий шаг:
- «Получить оценку похожего проекта».

### 4. Бриф `/brief/` или рабочий блок на Главной
Назначение:
- собрать первичные данные до разговора.

Следующий шаг:
- отправить ответы;
- показать успешную отправку;
- предложить Telegram как альтернативу.

### 5. Контакт `/contact/` или полноценный финальный блок
Назначение:
- дать реальный способ связи.

Должно быть:
- рабочая ссылка Telegram;
- рабочая форма;
- понятное ожидание ответа.

### 6. «Форматы работы»
Секция на Главной.

Назначение:
- объяснить варианты сотрудничества;
- помочь выбрать подходящий формат;
- привести к заявке.

Следующий шаг:
- перейти к брифу или контактам.

### 7. Обо мне
Секция на Главной.

Назначение:
- сформировать доверие;
- объяснить опыт, специализацию и подход.

### 8. Блог
Скрыт до появления реальных публикаций. Код сохранён.

## 7. Основной путь пользователя

### Маршрут A — клиент уже знает проблему
Главная → 3 направления → подходящее направление → релевантный кейс → Форматы работы → предварительная оценка → Telegram/форма.

### Маршрут B — клиент хочет проверить компетенции
Главная → проекты → кейс → доказательства → «Сделать похожее решение» → форма/Telegram.

### Маршрут C — клиент пока не знает решение
Главная → «Что хотите упростить?» → короткий бриф → рекомендации по формату → контакт.

## 8. Изменения по блокам

### Hero
Оставить:
- «От идеи до работающего AI-продукта».

Уточнить подзаголовок:
- фокус на AI-автоматизации, AI-агентах и AI-сервисах;
- добавить понятного клиента/ситуацию;
- убрать равноправное перечисление всего.

CTA:
- основной: «Получить предварительную оценку проекта»;
- второй: «Посмотреть реальные кейсы».

### Блок решений
Сократить витрину на первом уровне до 3 направлений:
- AI-автоматизация;
- AI-агенты;
- AI-сервисы и приложения.

Большой каталог Front Office / Back Office не удалять обязательно, но перенести ниже или сделать вторичным раскрываемым разделом.

### Кейсы
Убрать технологический стек из верхней части карточки.
В карточке сначала показывать:
- проблему;
- что сделано;
- подтверждённый результат/статус.

Технологии оставить внизу кейса или в отдельном блоке.

### Стоимость и формат
Добавить блок «Форматы работы».

Не придумывать цены без решения Виктора.

Подготовить структуру:
- Консультация / разбор задачи — [цена или «по договорённости»];
- Прототип / MVP — от [сумма];
- AI-агент — от [сумма];
- Автоматизация процесса — от [сумма];
- Развитие и поддержка — [формат].

До утверждения цифр использовать нейтральное:
> Стоимость зависит от объёма интеграций и данных. После короткого брифа — предварительная оценка и план работ.

### Обо мне
Добавить 4–6 конкретных предложений:
- специализация;
- тип задач;
- реальные проекты;
- подход;
- роль AI-инструментов в разработке;
- принцип «не обещать неподтверждённое».

Не добавлять неподтверждённый стаж, число клиентов или экономический эффект.

### Контакты
Обязательно подключить:
- рабочий Telegram;
- форму заявки;
- обработку успешной/ошибочной отправки;
- защиту от спама;
- минимальную политику по данным, если собираются контакты.

### Бриф
Сделать рабочим:
- 4–6 полей;
- обязательные: задача, текущий процесс, контакт;
- необязательные: данные/сервисы, сроки, бюджет;
- отправка;
- success state;
- fallback на Telegram.

### Блог
До реальных публикаций — скрыть.

## 9. Acceptance Criteria

Сайт считается коммерчески готовым, если:

1. За 10 секунд понятны 3 основных направления.
2. Понятно, для кого они предназначены.
3. На первом экране есть один главный CTA.
4. Главный CTA ведёт к реально работающему действию.
5. Telegram открывает реальный контакт.
6. Форма заявки реально отправляет данные.
7. Бриф реально отправляет данные.
8. «Обо мне» содержит 4–6 конкретных предложений.
9. В навигации нет незавершённых разделов.
10. Блог либо содержит минимум 2 опубликованных материала, либо скрыт.
11. Каждый кейс следует единой бизнес-структуре.
12. В карточках кейсов бизнес-задача идёт раньше стека.
13. Нет выдуманных метрик, отзывов, кейсов и результатов.
14. Есть блок формата работы/ориентира по стоимости.
15. Каждая ключевая страница имеет следующий шаг.
16. Пользователь может пройти путь Главная → кейс → заявка без тупика.
17. Mobile и desktop версии не имеют сломанных CTA.
18. Все публичные ссылки проверены.
19. Build и проверки проекта проходят без ошибок.
20. Перед публикацией выполнена визуальная приёмка.

## 10. Порядок реализации

### Этап 1 — конверсия
- подключить Telegram;
- подключить рабочую форму;
- сделать рабочий бриф;
- заменить CTA.

### Этап 2 — позиционирование
- выбрать 3 основных направления;
- уточнить целевого клиента;
- переработать hero и блок решений.

### Этап 3 — доверие
- заполнить «Обо мне»;
- унифицировать кейсы;
- перенести технические детали ниже;
- добавить блок форматов работы.

### Этап 4 — чистота структуры
- скрыть блог до публикаций;
- проверить меню;
- проверить карту сайта и пользовательские пути.

### Этап 5 — приёмка
- desktop/tablet/mobile;
- светлая/тёмная тема;
- все CTA;
- все формы;
- все внешние ссылки;
- `npm run check`;
- `npm run build`;
- финальная ручная проверка.


---

## AI Sales & Lead Intelligence Roadmap

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

**AI Consultant now covers routes A, B, and C as a clarification layer before brief/contact.**

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

### P1 — AI lead intelligence foundation (done)
- [x] event taxonomy (`src/scripts/events.ts`) — 18 typed events;
- [x] session/lead IDs (`src/scripts/session.ts`) — first-party UUID in sessionStorage, no fingerprinting, no PII;
- [x] consent-aware first-party analytics (`src/scripts/analytics.ts`) — page views, project/service views, CTA clicks;
- [x] unified lead schema (`leadContext`) sent with LeadForm and validated in Worker;
- [x] lead qualification / lead profile (P1.2) — rule-based engine in `server/lead-profile.mjs`, integrated into Worker, 24/24 worker tests pass;
- [x] UTM/source capture.

### P2 — AI Consultant (done)
- [x] Compact AI consultant widget on homepage (`src/components/AiConsultant.astro`, `src/scripts/ai-consultant.ts`).
- [x] Answers questions about real projects/services using server-side LLM (`server/consult-handler.mjs`, `server/consult-knowledge.mjs`, `server/llm-provider.mjs`).
- [x] Qualifies visitors by asking business-context questions.
- [x] Recommends only real cases and work formats; no hallucinated projects.
- [x] Structured handoff (`intent: 'handoff'`) parsed from LLM JSON into `aiHandoff` object.
- [x] Handoff passed visibly to LeadForm (`victor_ai_handoff` in `sessionStorage`), user can edit.
- [x] Events tracked: `ai_consultant_open`, `ai_consultant_message`, `ai_consultant_error`, `ai_consultant_handoff`.
- [x] Fallback UI when LLM unavailable (503 + `fallback: true`).
- [x] Security: server-side validation, length limits, origin/CORS, no HTML from model, prompt-injection resistance.
- [x] Tests: 15/15 consult-handler tests, 24/24 worker tests.
- [x] Mobile-first CSS with `prefers-reduced-motion` support.

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

### P2 — Back Office MVP (done)
- [x] Dashboard, Leads, AI Conversations, SEO, System on Astro + React + Tailwind.
- [x] Auth: server-side username/password, scrypt hash with salt, HttpOnly SameSite Secure cookie, SQLite sessions.
- [x] Leads table: server-side search, filters (status), sort, delete.
- [x] Lead detail: readonly fields (identity, task, qualification, session, AI handoff).
- [x] AI Conversations: list with messages, handoff summary.
- [x] SEO: static analysis + server-side page_seo_state.
- [x] System: integration status from SQLite, health indicators, logs from SQLite.
- [x] Data: SQLite via `node:sqlite` (`src/lib/db.ts`).
- [x] API routes: auth, ingest, leads, conversations, system, seo.
- [x] Worker ingestion: `POST /api/ingest/` with Bearer token, dedup by lead_id.
- [x] No localStorage as primary DB; no PUBLIC_ADMIN_PIN.

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

## Back Office / Admin / Growth & Operations Architecture

### Strategic target

The long-term system is:

**Public portfolio + AI Consultant + Lead Intelligence + Qualification + CRM context + Funnels + Lead Magnets + Email/Inbox + SEO/Search + Advertising + Analytics + Logs/Health + Secrets/Integrations + AI Operations Back Office.**

The business loop to optimize is:

**traffic/source → visitor intent → relevant content → AI consultation → lead → qualification → follow-up → deal → attribution/learning.**

The Back Office must make this loop observable, controllable, auditable, and safe.

### Target architecture

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
PostgreSQL or equivalent approved persistent store
        │
        ▼
DJANGO BACK OFFICE
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
The Back Office is built on the same Astro + React stack. Django is used only as a **reference** for UX/admin mechanics.

### Back Office mechanics to adopt

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

### Lead / CRM Back Office

#### Lead list

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

#### Lead detail

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

### AI Conversations

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

### Projects / Services / Work Formats

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

### Funnels and Lead Magnets

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

### Email / Inbox

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

### Analytics and attribution

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

### SEO / Search system

Create a dedicated Back Office area for SEO/Search.

#### Technical SEO
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

#### Search performance
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

### Yandex / Google marketing integrations

#### Yandex Metrika
Plan to surface visits/sessions, sources, goals, events, entry pages, geography at non-sensitive aggregate level, advertising traffic, and funnel events.

#### Yandex Direct
Plan to surface campaigns, ads/ad groups where useful, spend, clicks, CPC, conversions, qualified leads, high-intent leads, cost per qualified lead, and campaign → lead → outcome attribution.
Do not judge campaign quality from clicks alone.

#### Google Ads
Optional future integration: spend, clicks, CPC, conversions, qualified leads, attribution.

#### Google Search Console
Treat as SEO/search data, not advertising.

All external integrations must use approved API credentials and least-privilege access.

### Logs / observability / system health

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

### Secrets and integrations

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

No secret may be hardcoded, committed, exposed to browser bundles, written to logs, or stored as plain text in normal application tables.

Plan separate environment status:
- DEV
- STAGING
- PRODUCTION

### Roles / permissions / audit

Plan for roles such as Owner, Admin, Operator, Content Editor, Analyst, Viewer.
Default to least privilege.

Audit events should capture who, what, object, before/after where appropriate, timestamp, and source action.
High-risk actions should require explicit confirmation.

### AI Operations inside Back Office

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

### KokonutUI = UX mechanics store, NOT a design system

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

### MCP strategy

#### KokonutUI / shadcn MCP
Approved for Claude Code and Codex as a discovery/install interface.
Purpose: browse registry, inspect component code/dependencies, compare UX mechanics, install only after explicit approval.
Project registry should include:
`@kokonutui: https://kokonutui.com/r/{name}.json`

#### Back Office MCP
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

### Back Office delivery phases

#### Phase A — current
- P1/P1.2 Lead Intelligence foundation;
- P2 AI Consultant;
- P2.1 acceptance.

#### Phase B — persistent Lead Intelligence
- choose persistent store;
- Lead/Contact/Company/Event models;
- attribution timeline;
- deduplication;
- migration strategy.

#### Phase C — Back Office MVP (done)
- [x] Authentication — server-side username/password, scrypt hash with salt, HttpOnly SameSite Secure cookie, SQLite sessions;
- [x] Pages — Dashboard, Leads, Lead Detail, AI Conversations, SEO, System;
- [x] Leads table — server-side search, filters (status), sort, delete;
- [x] Lead detail — readonly fields (identity, task, qualification, session, AI handoff);
- [x] AI Conversations — list with messages, handoff summary;
- [x] SEO — static analysis + server-side page_seo_state;
- [x] System — integration status from SQLite, health indicators, logs from SQLite;
- [x] Data layer — SQLite via `node:sqlite` (`src/lib/db.ts`); tables: sessions, leads, conversations, system_logs, audit_events, integration_status, page_seo_state;
- [x] API routes — auth/login, auth/logout, auth/check, ingest, leads, conversations, system, seo;
- [x] Worker ingestion — POST `/api/ingest/` with Bearer token, dedup by lead_id;
- [x] No localStorage as primary DB; no PUBLIC_ADMIN_PIN;
- [x] Astro build passes, server-side tests pass.

#### Phase D — Growth Operations
- funnels;
- lead magnets;
- email/inbox;
- SEO/Search Console;
- Yandex Metrika;
- Yandex Direct;
- optional Google Ads;
- attribution.

#### Phase E — Operations & AI
- logs/health;
- integration status;
- secrets status;
- analytics dashboards;
- SEO Agent;
- Advertising Agent;
- Inbox Agent;
- Analytics Agent.

Each phase requires explicit approval before implementation.

### Definition of Done for Back Office features

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

## Visual direction

Premium AI-product aesthetic with one coherent visual system:

- restrained liquid-glass surfaces;
- selective Stripe-like animated backgrounds;
- strong dashboard and data presentation;
- purposeful Awwwards-level scroll motion;
- KokonutUI as a component/reference source where appropriate;
- no visual overload;
- no mixing of unrelated visual languages.

Visual effects are subordinate to usability, hierarchy, accessibility and conversion.



## Frontend CTA / visual system (2026-09-18, local)

Canonical public actions use `src/components/Cta.tsx` and `src/styles/cta.css` for both anchors and native submit buttons. A shared animated split boundary clips both surfaces and text layers; dark/light palettes, focus-visible, disabled, forced-colors and reduced-motion are supported. GradientButton is a legacy/deprecated compatibility component; new CTA markup should use Cta. Navigation links remain text. LeadForm updates both label layers without replacing the button markup.

`src/styles/public-visual.css` owns the public ambient violet/cyan gradient and panel glow; shooting stars are preserved as part of the unified public visual system alongside the ambient background. Format-card emblems reuse VMark/icon-host. Back Office, API, auth, database, routes and content are unchanged.

Validation: check/build pass (existing admin unused-import hint and dynamic getStaticPaths build warning); CTA SSR and form-label lifecycle checks pass. Browser visual acceptance remains manual because the browser runtime could not load. No commit, push or deploy.


### Homepage project carousel (2026-09-18, local)

The homepage now renders all eight projects from `src/data/projects.ts`, ordered LeadFlow, Content Factory, Travel, KMK, donskoe39, Leftover Food, FairyTales, Catch Job. It reuses the `/projects/` CarouselControls, data attributes, responsive horizontal scroll/snap, swipe and keyboard handlers. Project data, cards, CTA, background and backend are unchanged. Check/build pass with existing diagnostics; browser interaction acceptance remains manual. No commit/push/deploy.
