const configuredOrigin = import.meta.env.PUBLIC_SITE_URL?.trim();

function publicOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || ['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error('PUBLIC_SITE_URL must be a public HTTPS origin without credentials, path, query or fragment.');
  }
  return url.origin;
}

export const site = {
  title: 'Виктор — AI-агенты, сервисы и автоматизация',
  description: 'Разработка AI-агентов, AI-сервисов, сайтов и автоматизации для бизнес-задач. Проекты, подход к работе и направления решений.',
  origin: publicOrigin(configuredOrigin),
  allowIndexing: import.meta.env.PUBLIC_ALLOW_INDEXING === 'true',
};

export const isIndexable = Boolean(site.origin && site.allowIndexing);
export const publicPages = ['/'];

export function canonicalUrl(path: string) {
  return site.origin ? new URL(path, site.origin).href : undefined;
}
