import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// אייקוני PWA ו-Favicon נוצרים מ-public/icon.svg (DESIGN §2.4 App Icon) – `npm run icons`
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0A1628' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0A1628' } },
  },
  images: ['public/icon.svg'],
});
