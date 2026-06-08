import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@game': fileURLToPath(new URL('../shared-game', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
  },
});
