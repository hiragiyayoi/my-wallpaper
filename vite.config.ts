import { defineConfig } from 'vitest/config';

export default defineConfig({
  // NF-008: すべての参照は相対パス (Wallpaper Engine / Plash の file:// 読み込み対応)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: false,
    restoreMocks: true,
  },
});
