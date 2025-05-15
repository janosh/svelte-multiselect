import { sveltekit } from '@sveltejs/kit/vite'
import mdsvexamples from 'mdsvexamples/vite'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [sveltekit(), mdsvexamples],

  test: {
    environment: `jsdom`,
    css: true,
    coverage: {
      reporter: [`text`, `json-summary`],
    },
    setupFiles: [resolve(__dirname, `tests/setup.ts`)],
  },

  resolve: process.env.TEST
    ? {
        conditions: [`browser`],
      }
    : undefined,

  server: {
    fs: { allow: [`..`] }, // needed to import from $root
    port: 3000,
  },

  preview: {
    port: 3000,
  },
})
