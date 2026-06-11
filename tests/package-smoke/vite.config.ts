import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: [`svelte`, `browser`],
  },
  build: {
    // Lightning CSS warns on the standard ::highlight() pseudo-element.
    cssMinify: false, // Package smoke only validates packaging/importability, no need to minify here.
    emptyOutDir: true,
    outDir: `test-results/package-smoke-build`,
    rollupOptions: {
      input: `tests/package-smoke/index.html`,
    },
  },
})
