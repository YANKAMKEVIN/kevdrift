import { defineConfig } from 'vitest/config';

// base relative : le jeu marche sous https://yankamkevin.github.io/kevdrift/ comme en local.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 300,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
  },
});
