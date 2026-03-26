import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite-plus'
import live_examples from './src/lib/live-examples/vite-plugin.ts'

export default defineConfig({
  // Skip all CSS polyfills — only target latest browsers
  css: { lightningcss: { exclude: 0x1fffff } },
  fmt: {
    semi: false,
    singleQuote: true,
    printWidth: 90,
  },
  lint: {
    plugins: [`oxc`, `typescript`, `unicorn`, `import`, `jest`],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    categories: {
      correctness: `error`,
      suspicious: `error`,
      pedantic: `error`,
      perf: `error`,
    },
    ignorePatterns: [`build/`, `.svelte-kit/`, `package/`, `dist/`],
    rules: {
      'no-unused-vars': `off`, // superseded by type-aware version below
      '@typescript-eslint/no-unused-vars': [
        `error`,
        { argsIgnorePattern: `^_`, varsIgnorePattern: `^_` },
      ],
      'no-console': [`error`, { allow: [`warn`, `error`] }],
      eqeqeq: `error`,
      // Svelte: oxlint can't see template usage or reactive patterns
      'no-self-assign': `off`, // reactive `x = x`
      'no-await-in-loop': `off`, // sequential await tick() in tests
      'no-shadow': `off`, // closures intentionally shadow
      'prefer-const': `off`, // `let` needed for $state/$derived/$bindable
      '@typescript-eslint/no-unnecessary-condition': `off`, // reactive narrowing false positives
      '@typescript-eslint/consistent-type-imports': `off`, // template component import false positives
      'eslint-plugin-unicorn/consistent-function-scoping': `off`, // Svelte reactive closures
      // DOM/any propagation — oxlint lacks DOM type stubs
      '@typescript-eslint/no-unsafe-argument': `off`,
      '@typescript-eslint/no-unsafe-assignment': `off`,
      '@typescript-eslint/no-unsafe-call': `off`,
      '@typescript-eslint/no-unsafe-member-access': `off`,
      '@typescript-eslint/no-unsafe-return': `off`,
      // Pedantic rules too noisy for this codebase
      'no-inline-comments': `off`,
      'no-confusing-void-expression': `off`,
      'no-promise-executor-return': `off`,
      'strict-boolean-expressions': `off`, // truthiness checks are idiomatic
      'max-lines-per-function': `off`,
      'max-lines': `off`,
      'max-depth': `off`,
      'max-classes-per-file': `off`,
      'sort-vars': `off`,
      'eslint-plugin-jest/no-conditional-in-test': `off`, // parameterized tests use conditionals
      'eslint-plugin-unicorn/no-array-callback-reference': `off`,
      'eslint-plugin-unicorn/no-useless-undefined': `off`,
      'eslint-plugin-unicorn/no-object-as-default-parameter': `off`,
      'eslint-plugin-import/no-self-import': `off`, // CopyButton self-mounts in global mode
      'eslint-plugin-import/no-unassigned-import': `off`, // CSS side-effect imports
      'eslint-plugin-import/max-dependencies': `off`,
    },
  },
  staged: {
    '*.{js,ts,svelte,html,css,md,json,yaml}': `vp check --fix`,
    '*.{ts,svelte}': `sh -c 'npx svelte-kit sync && npx svelte-check-rs --threshold error'`,
    '*.test.ts': `sh -c '! grep -E "(test|describe)\\.only\\(" "$@"' --`,
    '*': `codespell --ignore-words-list falsy --check-filenames`,
  },
  plugins: [sveltekit(), ...live_examples()],

  test: {
    include: [`tests/vitest/**/*.test.ts`],
    environment: `happy-dom`,
    css: true,
    coverage: {
      reporter: [`text`, `json-summary`],
      include: [`src/lib/**/*.{ts,svelte}`],
    },
    setupFiles: [`tests/vitest/setup.ts`],
  },

  optimizeDeps: {
    exclude: [`svelte-toc`],
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
