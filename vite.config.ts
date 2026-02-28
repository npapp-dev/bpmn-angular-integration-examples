/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(({ mode }) => ({
  plugins: [angular()],
  test: {
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/app/**/*.ts'],
      exclude: [
        'src/app/**/*.spec.ts',
        'src/app/**/*.module.ts',
        'src/app/**/*.model.ts',
        'src/app/**/index.ts',
        'src/app/app-routing.module.ts',
        'src/app/custom-properties-provider/**',
        'src/app/models/provider.elements.ts'
      ]
    },
    server: {
      deps: {
        inline: [/bpmn-js/, /@bpmn-io/, /diagram-js/, /min-dash/, /min-dom/]
      }
    }
  },
}));
