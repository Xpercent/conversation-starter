import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  /*
   * Relative asset paths, so one build works both from a GitHub Pages project
   * subpath and from a file:// URL opened straight off disk.
   *
   * There is no topic-writing dev middleware here: the bank lives in the
   * visitor's browser (see src/lib/topicsStore.ts), which is what lets the
   * editor work in a deployed build rather than only under `npm run dev`.
   */
  base: './',
});
