import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: [`svelte`, `browser`],
  },
  build: {
    emptyOutDir: true,
    outDir: `test-results/package-smoke-build`,
    rollupOptions: {
      input: `tests/package-smoke/index.html`,
    },
  },
})
