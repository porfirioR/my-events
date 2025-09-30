import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    postcss: '.postcssrc.json'
  },
  optimizeDeps: {
    include: [
      '@angular/core',
      '@angular/common',
      '@ngrx/signals',
      'rxjs',
      'rxjs/operators'
    ],
    exclude: []
  },
  ssr: {
    noExternal: ['@ngrx/signals']
  }
});