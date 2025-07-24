import { sveltekit } from '@sveltejs/kit/vite'
import mdsvexamples from 'mdsvexamples/vite'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [sveltekit(), mdsvexamples],

  test: {
    include: [`tests/vitest/**/*.test.ts`],
    environment: `jsdom`,
    css: true,
    coverage: {
      reporter: [`text`, `json-summary`],
      include: [`src/lib/**/*.{ts,svelte}`],
    },
    setupFiles: [resolve(__dirname, `tests/vitest/setup.ts`)],
  },

  resolve: {
    conditions: process.env.TEST ? [`browser`] : undefined,
  },

  server: {
    fs: { allow: [`..`] }, // needed to import from $root
    port: 3000,
  },

  preview: {
    port: 3000,
  },
})
