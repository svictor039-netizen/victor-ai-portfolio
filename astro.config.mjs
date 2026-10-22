import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  trailingSlash: 'always',
  // За nginx адаптер видит внутренний localhost:3002. Доверяем X-Forwarded-Host/Proto
  // только для явно разрешённого production-домена по https — тогда request.url
  // совпадает с Origin браузера (нужно для проверки Origin в /api/catch-job/*).
  security: {
    allowedDomains: [{ hostname: 'ailabstudio.ru', protocol: 'https' }],
  },
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  devToolbar: { enabled: false },
});
