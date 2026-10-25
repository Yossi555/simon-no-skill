import { BASE, pwaOptions } from './pwaOptions';

describe('PWA options', () => {
  const manifest = pwaOptions.manifest as Record<string, unknown> & {
    icons: { sizes: string; purpose?: string }[];
  };

  it('keeps the manifest under the GitHub Pages base path', () => {
    expect(BASE).toBe('/simon-no-skill/');
    expect(manifest.start_url).toBe(BASE);
    expect(manifest.scope).toBe(BASE);
    expect(manifest.id).toBe('/simon-no-skill/app');
  });

  it('declares Hebrew RTL standalone app named Disco Go', () => {
    expect(manifest).toMatchObject({
      name: 'Disco Go',
      short_name: 'Disco Go',
      lang: 'he',
      dir: 'rtl',
      display: 'standalone',
    });
  });

  it('provides 192, 512 and maskable install icons', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('never forces a reload: prompt updates, no skipWaiting', () => {
    expect(pwaOptions.strategies).toBe('generateSW');
    expect(pwaOptions.registerType).toBe('prompt');
    expect(pwaOptions.workbox?.skipWaiting).toBeUndefined();
    expect(pwaOptions.workbox?.clientsClaim).toBeUndefined();
  });

  it('precaches fonts and icons for offline use', () => {
    expect(pwaOptions.workbox?.globPatterns?.[0]).toMatch(/woff2/);
    expect(pwaOptions.workbox?.globPatterns?.[0]).toMatch(/png/);
    expect(pwaOptions.workbox?.runtimeCaching).toBeUndefined();
  });
});
