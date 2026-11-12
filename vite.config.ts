import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages など，サブパスに置いても動くように相対パスで出力する
  base: './',
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'] },
});
