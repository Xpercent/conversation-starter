import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
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

  build: {
    rollupOptions: {
      output: {
        /*
         * `--mode single` feeds scripts/bundle-single-file.ts, which folds the
         * whole app into one double-clickable HTML file for offline
         * distribution (see scripts/pack-china.ts).
         *
         * That bundler can only inline one script tag, and importTopics.ts
         * pulls in read-excel-file via a dynamic import() — worth a separate
         * 66KB chunk when the app is served, since most visitors never import
         * a spreadsheet, but unsplittable once everything lives in one file.
         * Inlining dynamic imports collapses it back to a single chunk. There
         * is no network round-trip to save in an offline artifact anyway.
         */
        inlineDynamicImports: mode === 'single',
      },
    },
  },
}));
