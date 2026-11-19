import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so tests do not load the React/Tailwind build plugins.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
