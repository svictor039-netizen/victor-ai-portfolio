export const contact = {
  telegram: 'https://t.me/Rotciv_kld',
  email: 'vslpk@inbox.ru',
  primaryCta: 'Получить предварительную оценку проекта',
  secondaryCta: 'Посмотреть реальные кейсы',
  caseCta: 'Получить оценку похожего проекта',
};

const endpoint = import.meta.env.PUBLIC_LEAD_ENDPOINT?.trim() || '';
if (endpoint) {
  const url = new URL(endpoint);
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if ((!isLocalhost && url.protocol !== 'https:') || url.username || url.password || url.hash || url.search) {
    throw new Error('PUBLIC_LEAD_ENDPOINT must be an HTTPS URL without credentials, query or fragment.');
  }
}

export const leadDelivery = {
  endpoint,
  sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() || '',
  consentConfirmed: import.meta.env.PUBLIC_LEAD_CONSENT_CONFIRMED === 'true',
};
