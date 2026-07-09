import { svelte } from '@sveltejs/vite-plugin-svelte'
// self-reference resolves via package.json exports to the packaged dist build,
// proving the live-examples subpath (incl. its vite parseSync import) is consumable
import { vite_plugin as live_examples } from 'svelte-multiselect/live-examples'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte(), ...live_examples()],
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
