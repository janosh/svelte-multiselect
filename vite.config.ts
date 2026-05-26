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
    plugins: [`oxc`, `typescript`, `unicorn`, `import`, `vitest`],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    categories: {
      correctness: `error`,
      suspicious: `error`,
      perf: `error`,
    },
    ignorePatterns: [`build/`, `.svelte-kit/`, `package/`, `dist/`],
    rules: {
      // Extra rules not in the enabled categories
      'no-console': [`error`, { allow: [`info`, `warn`, `error`] }],
      'no-template-curly-in-string': `error`,
      'no-constructor-return': `error`,
      'default-param-last': `error`,
      'guard-for-in': `error`,
      'eslint-plugin-unicorn/prefer-array-find': `error`,
      'eslint-plugin-unicorn/no-typeof-undefined': `error`,
      'eslint-plugin-unicorn/prefer-optional-catch-binding': `error`,
      'eslint-plugin-unicorn/no-length-as-slice-end': `error`,
      'eslint-plugin-unicorn/prefer-node-protocol': `error`,
      'eslint-plugin-unicorn/throw-new-error': `error`,
      'eslint-plugin-unicorn/prefer-type-error': `error`,
      'eslint-plugin-unicorn/prefer-date-now': `error`,
      'eslint-plugin-unicorn/require-number-to-fixed-digits-argument': `error`,
      'eslint-plugin-unicorn/no-useless-promise-resolve-reject': `error`,
      'eslint-plugin-unicorn/custom-error-definition': `error`,
      'eslint-plugin-import/no-duplicates': `error`,
      '@typescript-eslint/no-non-null-assertion': `error`,
      '@typescript-eslint/prefer-string-starts-ends-with': `error`,
      '@typescript-eslint/prefer-readonly': `error`,
      '@typescript-eslint/prefer-regexp-exec': `error`,
      '@typescript-eslint/prefer-find': `error`,
      '@typescript-eslint/no-deprecated': `error`,
      '@typescript-eslint/no-misused-promises': `error`,
      '@typescript-eslint/restrict-plus-operands': `error`,
      '@typescript-eslint/no-dynamic-delete': `error`,
      '@typescript-eslint/no-empty-object-type': `error`,
      '@typescript-eslint/no-explicit-any': `error`,
      '@typescript-eslint/no-import-type-side-effects': `error`,
      '@typescript-eslint/no-invalid-void-type': `error`,
      '@typescript-eslint/no-mixed-enums': `error`,
      '@typescript-eslint/no-require-imports': `error`,
      '@typescript-eslint/only-throw-error': `error`,
      '@typescript-eslint/ban-ts-comment': `error`,
      '@typescript-eslint/consistent-type-imports': `error`,
      '@typescript-eslint/prefer-function-type': `error`,
      '@typescript-eslint/prefer-includes': `error`,
      '@typescript-eslint/prefer-optional-chain': `error`,
      '@typescript-eslint/prefer-reduce-type-parameter': `error`,
      '@typescript-eslint/prefer-ts-expect-error': `error`,
      '@typescript-eslint/return-await': `error`,
      '@typescript-eslint/switch-exhaustiveness-check': `error`,
      '@typescript-eslint/unified-signatures': `error`,
      'array-callback-return': `error`,
      'prefer-object-has-own': `error`,
      'eslint-plugin-promise/no-multiple-resolved': `error`,
      'eslint-plugin-promise/no-return-in-finally': `error`,
      'eslint-plugin-promise/param-names': `error`,
      'eslint-plugin-promise/valid-params': `error`,
      '@typescript-eslint/consistent-type-exports': `error`,
      'eslint-plugin-unicorn/require-array-join-separator': `error`,
      'no-useless-computed-key': `error`,
      'eslint-plugin-vitest/prefer-strict-boolean-matchers': `error`,
      'eslint-plugin-vitest/prefer-each': `error`,
      'eslint-plugin-vitest/prefer-called-exactly-once-with': `error`,
      'eslint-plugin-vitest/require-awaited-expect-poll': `error`,

      '@typescript-eslint/no-unused-vars': [
        `error`,
        { argsIgnorePattern: `^_`, varsIgnorePattern: `^_` },
      ],
      'eslint-plugin-vitest/require-mock-type-parameters': `off`, // noisy without manual type annotations
      // Svelte: oxlint can't see template usage or reactive patterns
      'no-await-in-loop': `off`, // sequential await tick() in tests
      'prefer-const': `off`, // `let` needed for $state/$derived/$bindable
      '@typescript-eslint/no-unnecessary-condition': `off`, // reactive narrowing false positives
      '@typescript-eslint/prefer-readonly-parameter-types': `off`, // noisy for DOM callbacks
      'eslint-plugin-unicorn/consistent-function-scoping': `off`, // Svelte reactive closures
      // DOM/any propagation — oxlint lacks DOM type stubs
      // Pedantic rules too noisy for this codebase
      'no-inline-comments': `off`,
      'no-confusing-void-expression': `off`,
      'strict-boolean-expressions': `off`, // truthiness checks are idiomatic
      'max-lines-per-function': `off`,
      'max-lines': `off`,
      'eslint-plugin-vitest/no-conditional-expect': `off`, // parameterized tests use conditionals
      'eslint-plugin-vitest/no-conditional-in-test': `off`, // parameterized tests use conditionals
      'eslint-plugin-vitest/valid-expect': [`error`, { maxArgs: 2 }], // Vitest supports expect messages
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

  build: {
    // Default cssTarget is chrome111 which doesn't support light-dark(),
    cssTarget: `esnext`, // causing LightningCSS to polyfill it with broken space toggles
  },
})
