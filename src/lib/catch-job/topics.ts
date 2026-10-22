/**
 * Catch_Job_4Me: разбиение постов на заказы и детерминированная классификация.
 * Без LLM. Результат зависит только от текста и версии словаря.
 * Классификация распределяет по тематикам, но ничего не отсеивает:
 * бизнес-фильтров (бюджет, рейтинг, стоп-слова заказчика) здесь нет.
 */

export const CLASSIFIER_VERSION = 'topics-v1';

export const TOPICS = [
  { code: 'sites', label: 'Сайты и лендинги' },
  { code: 'bots', label: 'Telegram-боты' },
  { code: 'ai', label: 'AI-агенты и автоматизация' },
  { code: 'integrations', label: 'Интеграции CRM и сервисов' },
  { code: 'webapps', label: 'Веб-приложения' },
] as const;

export type TopicCode = (typeof TOPICS)[number]['code'];
export type ItemTopic = TopicCode | 'unclassified';

export const TOPIC_CODES: TopicCode[] = TOPICS.map((t) => t.code);
export const TOPIC_LABELS: Record<ItemTopic, string> = {
  ...(Object.fromEntries(TOPICS.map((t) => [t.code, t.label])) as Record<TopicCode, string>),
  unclassified: 'Тематика не определена',
};

export function isTopicCode(value: unknown): value is TopicCode {
  return typeof value === 'string' && (TOPIC_CODES as string[]).includes(value);
}

// При равном числе совпадений побеждает более узкая тематика
const TIE_ORDER: TopicCode[] = ['bots', 'ai', 'integrations', 'webapps', 'sites'];

// Каждый шаблон — отдельный признак; счёт = число совпавших шаблонов тематики
const PATTERNS: Record<TopicCode, RegExp[]> = {
  bots: [
    /(телеграм|telegram|тг|tg)[\s-]*бот/,
    /чат[\s-]*бот/,
    /(^|[^а-яё])бот(а|ов|ы|у|ом)?([^а-яё]|$)/,
    /(^|[^а-яё])(max|мах|макс)([^а-яё]|$)/,
  ],
  ai: [
    /(^|[^а-яё])ии([^а-яё]|$)|ии-/,
    /(^|[^a-z])ai([^a-z]|$)/,
    /нейросет|gpt|claude|llm|dify|lovable|n8n|zapier|make\.com/,
    /агент/,
    /автоматиз/,
  ],
  integrations: [
    /crm|срм|амо|amo|okocrm|битрикс[\s-]*24|bitrix[\s-]*24/,
    /интеграц|webhook|вебхук|синхрониз|выгрузк/,
    /(^|[^а-яёa-z])(api|апи)([^а-яёa-z]|$)/,
    /телефони|sipuni|1с[:\s]|эдо/,
    /уведомлен/,
  ],
  webapps: [
    /веб[\s-]*приложен|вебприложен|web[\s-]*app|pwa/,
    /личн\S* кабинет|админ\S*[\s-]*панел|административн\S* панел|портал/,
    /react|vue|laravel|django|node\.?js/,
    /авторизац|калькулятор|викторин|квиз|онлайн[\s-]*чат/,
  ],
  sites: [
    /сайт/,
    /лендинг|landing|визитк|taplink/,
    /tilda|тильд|wordpress|вордпресс|wpress|joomla|opencart|опенкарт|битрикс(?![\s-]*24)|бус([^а-яё]|$)|evolution cms|october cms|shop-script|elementor/,
    /верст|вёрст|html/,
    /хостинг|домен/,
  ],
};

// «спам-боты» — не Telegram-боты; генерация медиа с ИИ — не AI-агенты
const BOTS_NOISE = /спам[\s-]*бот\S*/g;
const AI_MEDIA = /фото|видео|ролик|озвучк|дизайн|иллюстрац|картин|аватар|стикер/;
const AI_AGENT_CUES = /агент|автоматиз|(^|[^а-яё])бот/;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
  bull: '•', times: '×', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', copy: '©', reg: '®', deg: '°', middot: '·',
};

/** MCP отдаёт текст с HTML-сущностями — декодируем до разбиения и классификации. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

export interface SplitItem {
  index: number;
  title: string;
}

const HEADLINE_RE = /^\s*⚡️?\s*(.*?)\s*$/;
const MORE_RE = /узнать\s+больше/i;

/**
 * Разбиение поста на заказы (структура поста, не фильтр):
 * job_developer — каждая строка «⚡ заголовок» (маркер может стоять отдельной строкой);
 * kwork_birzha — один пост = один заказ, заголовок — первая непустая строка.
 */
export function splitPost(handle: string, rawText: string): SplitItem[] {
  const text = decodeEntities(rawText || '');
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  if (!lines.some(Boolean)) return [];

  if (handle === 'job_developer') {
    const items: SplitItem[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(HEADLINE_RE);
      if (!m) continue;
      let title = m[1];
      if (!title) {
        const next = lines.slice(i + 1).find(Boolean);
        title = next && !MORE_RE.test(next) && !HEADLINE_RE.test(next) ? next : '';
      }
      if (title) items.push({ index: items.length, title: title.slice(0, 200) });
    }
    return items;
  }

  const first = lines.find(Boolean)!;
  return [{ index: 0, title: first.slice(0, 200) }];
}

export interface Classification {
  topic: ItemTopic;
  tags: TopicCode[];
  scores: Record<TopicCode, number>;
}

export function classifyTitle(title: string): Classification {
  const text = decodeEntities(title).toLowerCase().replace(/ё/g, 'е');
  const scores = {} as Record<TopicCode, number>;
  for (const code of TOPIC_CODES) {
    const source = code === 'bots' ? text.replace(BOTS_NOISE, ' ') : text;
    scores[code] = PATTERNS[code].filter((re) => re.test(source)).length;
  }
  if (scores.ai > 0 && AI_MEDIA.test(text) && !AI_AGENT_CUES.test(text)) scores.ai = 0;

  const matched = TIE_ORDER.filter((c) => scores[c] > 0);
  if (matched.length === 0) return { topic: 'unclassified', tags: [], scores };
  const best = Math.max(...matched.map((c) => scores[c]));
  const topic = matched.find((c) => scores[c] === best)!;
  return { topic, tags: matched.filter((c) => c !== topic), scores };
}
