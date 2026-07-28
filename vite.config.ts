import { sveltekit } from '@sveltejs/kit/vite'
import live_examples from './src/lib/live-examples/vite-plugin.ts'
import { make_config } from './src/lib/vite-config.ts'

export default {
  // shared lint/fmt/build/staged, published as svelte-widgets/vite-config
  ...make_config({
    staged: {
      // shared hook runs the JS svelte-check; CI here uses the Rust port
      '*.{ts,svelte}': `sh -c 'npx svelte-kit sync && npx svelte-check-rs --threshold error'`,
      '*.test.ts': `sh -c '! grep -E "(test|describe)\\.only\\(" "$@"' --`,
      // >fo< spares the text-search fixtures splitting `foo` across inline markup
      '*': `codespell --ignore-words-list falsy --ignore-regex '>fo<' --check-filenames`,
    },
  }),

  plugins: [sveltekit(), ...live_examples()],

  test: {
    include: [`tests/vitest/**/*.test.ts`],
    environment: `happy-dom`,
    css: true,
    coverage: {
      reporter: [`text`, `json-summary`],
      include: [`src/lib/**/*.{ts,svelte}`],
      exclude: [`src/lib/vite-config.ts`], // build tooling, not shipped runtime code
      thresholds: {
        statements: 95,
        branches: 89.8,
        functions: 95,
        lines: 95,
      },
    },
    setupFiles: [`tests/vitest/setup.ts`],
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
}
