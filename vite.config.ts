import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Largest asset worth precaching: the PDF.js worker is ~1.4 MB.
const MAX_PRECACHE_BYTES = 3 * 1024 * 1024;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': a new version waits until the user accepts it, so an open conversion is never reloaded.
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'toMD',
        short_name: 'toMD',
        description:
          'Convert PDF, DOCX, PPTX, XLSX, HTML, EPUB, images, and more to clean Markdown — all locally in your browser.',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,woff,woff2,svg,png}'],
        // OCR engine files are large and only needed with OCR on (which also needs the network for
        // language data), so they are cached on first use instead of at install.
        globIgnores: ['**/tesseract-core*', '**/worker.min-*'],
        maximumFileSizeToCacheInBytes: MAX_PRECACHE_BYTES,
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/(tesseract-core|worker\.min)-/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'ocr-engine' },
          },
        ],
      },
    }),
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['motion'],
          markdown: ['marked', 'dompurify', 'turndown'],
          zip: ['jszip'],
        },
      },
    },
  },
});
