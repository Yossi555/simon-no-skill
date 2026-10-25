import type { VitePWAOptions } from 'vite-plugin-pwa';

// נתיב הפריסה ב-GitHub Pages (ADR-8); start_url ו-scope נגזרים ממנו
export const BASE = '/simon-no-skill/';

const BACKGROUND = '#0A1628';

// ARCHITECTURE §2.7: generateSW, Precache מלא, ועדכון ללא Reload כפוי.
// registerType 'prompt' ללא skipWaiting: SW חדש ממתין ונכנס לתוקף רק בפתיחה הבאה של האפליקציה,
// ולכן משחק פעיל לעולם לא נקטע (אין רכיב UI לעדכון – החלטת משתמש ב-Milestone 5).
export const pwaOptions: Partial<VitePWAOptions> = {
  strategies: 'generateSW',
  registerType: 'prompt',
  injectRegister: 'auto',
  includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
  manifest: {
    id: `${BASE}app`, // ADR-9 – אסור לשנות
    name: 'Disco Go',
    short_name: 'Disco Go',
    description: 'משחק זיכרון צבעים וצלילים בסגנון Simon',
    lang: 'he',
    dir: 'rtl',
    display: 'standalone',
    orientation: 'portrait',
    start_url: BASE,
    scope: BASE,
    theme_color: BACKGROUND,
    background_color: BACKGROUND,
    icons: [
      { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
  },
};
