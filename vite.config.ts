import { config } from '@janosh/vite-config'
import { sveltekit } from '@sveltejs/kit/vite'
import live_examples from './src/lib/live-examples/vite-plugin.ts'

export default {
  ...config, // shared lint/fmt/build from @janosh/vite-config (dotfiles)
  staged: {
    // not spread from config.staged: typed as a record *or* a function, so no-misused-spread
    '*.{js,ts,svelte,html,css,md,json,yaml}': `vp check --fix`,
    // shared hook runs the JS svelte-check; CI here uses the Rust port
    '*.{ts,svelte}': `sh -c 'npx svelte-kit sync && npx svelte-check-rs --threshold error'`,
    // >fo< spares the text-search fixtures splitting `foo` across inline markup
    '*': `codespell --ignore-words-list falsy --ignore-regex '>fo<' --check-filenames`,
  },

  plugins: [sveltekit(), ...live_examples()],

  test: {
    include: [`tests/vitest/**/*.test.ts`],
    environment: `happy-dom`,
    css: true,
    coverage: {
      reporter: [`text`, `json-summary`],
      include: [`src/lib/**/*.{ts,svelte}`],
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
