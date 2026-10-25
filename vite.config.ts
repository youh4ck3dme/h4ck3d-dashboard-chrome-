import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

/** Mirror the production security headers from vercel.json in `vite preview` so CSP issues surface locally. */
function productionHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const global = config.headers.find((h) => h.source === '/(.*)');
  return Object.fromEntries(
    (global?.headers ?? [])
      .filter((h) => h.key !== 'Strict-Transport-Security')
      .map((h) => [h.key, h.value.replace('; upgrade-insecure-requests', '')]),
  );
}

const THEME = '#0f1010';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon-48x48.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'H4CK3D Project Timeline',
        short_name: 'H4CK3D',
        description: 'GitHub, Vercel a lokálne projekty v jednej timeline.',
        lang: 'sk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'any',
        theme_color: THEME,
        background_color: THEME,
        categories: ['developer', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2', 'splash/**'],
        injectionPoint: 'self.__WB_MANIFEST',
      },
      devOptions: { enabled: false },
    }),
  ],
  preview: {
    headers: productionHeaders(),
  },
  build: {
    target: 'es2020',
    // Set SOURCEMAP=true to emit hidden source maps (e.g. for uploading to an error tracker).
    sourcemap: process.env.SOURCEMAP === 'true' ? 'hidden' : false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
