// Shared vite-plus config for janosh's Svelte/Vite projects, as `make_config(overrides)`:
//
//   export default { ...make_config({ fmt: { printWidth: 95 } }), plugins: [sveltekit()] }
//
// Sections merge one level deep over the defaults, so retuning one rule or staged glob
// restates nothing else. Members are typed via SharedConfig rather than left to infer:
// a 143-key inferred literal blows TS's instantiation depth when spread into UserConfig.
import type { UserConfig } from 'vite-plus'
import type { OxlintConfig } from 'vite-plus/lint'

export type SharedConfig = {
  lint: OxlintConfig & {
    ignorePatterns: string[]
    rules: NonNullable<OxlintConfig[`rules`]>
  }
  fmt: NonNullable<UserConfig[`fmt`]>
  build: NonNullable<UserConfig[`build`]>
  // lint-n lets a whole staged config be one function; ours is always a glob map, and
  // vite-plus JSON.stringifies it to reach its Rust side, where a function is dropped
  staged: Extract<NonNullable<UserConfig[`staged`]>, Record<string, unknown>>
}

const lint: SharedConfig[`lint`] = {
  plugins: [`oxc`, `typescript`, `unicorn`, `import`, `vitest`],
  options: { typeAware: true, typeCheck: true },
  categories: { correctness: `error`, suspicious: `error`, perf: `error` },
  // Generic build-output dirs; projects append their own (e.g. `extensions/**`, `static/**`)
  ignorePatterns: [`build/**`, `.svelte-kit/**`, `package/**`, `dist/**`],
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
    // === Tier 1: zero-violation guard rails ===
    'no-var': `error`,
    'no-self-compare': `error`,
    'prefer-arrow-callback': `error`,
    'no-array-constructor': `error`,
    'no-new-wrappers': `error`,
    'prefer-numeric-literals': `error`,
    'default-case-last': `error`,
    'no-object-constructor': `error`,
    '@typescript-eslint/prefer-enum-initializers': `error`,
    '@typescript-eslint/prefer-literal-enum-member': `error`,
    '@typescript-eslint/consistent-type-assertions': `error`,
    'eslint-plugin-unicorn/prefer-array-some': `error`,
    'eslint-plugin-unicorn/prefer-array-flat': `error`,
    'eslint-plugin-unicorn/prefer-math-min-max': `error`,
    'eslint-plugin-unicorn/prefer-negative-index': `error`,
    'eslint-plugin-unicorn/prefer-includes': `error`,
    'eslint-plugin-unicorn/prefer-default-parameters': `error`,
    'eslint-plugin-unicorn/prefer-logical-operator-over-ternary': `error`,
    'eslint-plugin-unicorn/max-nested-calls': [`error`, { max: 3 }],
    'eslint-plugin-unicorn/no-instanceof-array': `error`,
    'eslint-plugin-unicorn/prefer-keyboard-event-key': `error`,
    'eslint-plugin-unicorn/error-message': `error`,
    'eslint-plugin-unicorn/escape-case': `error`,
    'eslint-plugin-unicorn/prefer-prototype-methods': `error`,
    'eslint-plugin-unicorn/no-console-spaces': `error`,
    'eslint-plugin-unicorn/prefer-dom-node-dataset': `error`,
    'eslint-plugin-unicorn/prefer-query-selector': `error`,
    'eslint-plugin-unicorn/prefer-modern-dom-apis': `error`,
    'eslint-plugin-unicorn/prefer-dom-node-text-content': `error`,
    'eslint-plugin-unicorn/text-encoding-identifier-case': `error`,
    'eslint-plugin-unicorn/no-unreadable-iife': `error`,
    'eslint-plugin-unicorn/consistent-empty-array-spread': `error`,
    'eslint-plugin-unicorn/no-unnecessary-slice-end': `error`,
    'oxc/bad-bitwise-operator': `error`,
    'eslint-plugin-vitest/no-identical-title': `error`,
    'eslint-plugin-vitest/prefer-comparison-matcher': `error`,
    'eslint-plugin-vitest/prefer-equality-matcher': `error`,
    'eslint-plugin-vitest/prefer-to-contain': `error`,
    'eslint-plugin-vitest/prefer-hooks-on-top': `error`,
    'eslint-plugin-vitest/prefer-hooks-in-order': `error`,
    'eslint-plugin-vitest/no-test-return-statement': `error`,
    // === Tier 2: small cleanups (mostly autofixable) ===
    'no-else-return': `error`,
    'object-shorthand': `error`,
    'prefer-template': `error`,
    'operator-assignment': `error`,
    'no-multi-assign': `error`,
    'no-lonely-if': `error`,
    'symbol-description': `error`,
    'no-useless-return': `error`,
    '@typescript-eslint/array-type': `error`,
    '@typescript-eslint/consistent-generic-constructors': `error`,
    '@typescript-eslint/consistent-indexed-object-style': `error`,
    '@typescript-eslint/prefer-promise-reject-errors': `error`,
    'eslint-plugin-unicorn/prefer-dom-node-append': `error`,
    'eslint-plugin-unicorn/consistent-existence-index-check': `error`,
    'eslint-plugin-unicorn/prefer-string-slice': `error`,
    'eslint-plugin-unicorn/no-hex-escape': `error`,
    'eslint-plugin-unicorn/prefer-import-meta-properties': `error`,
    'eslint-plugin-unicorn/prefer-native-coercion-functions': `error`,
    'eslint-plugin-unicorn/prefer-number-coercion': `error`,
    'eslint-plugin-unicorn/prefer-math-trunc': `error`,
    'eslint-plugin-unicorn/no-useless-collection-argument': `error`,
    'eslint-plugin-unicorn/numeric-separators-style': [
      `error`,
      { onlyIfContainsSeparator: true },
    ],
    'eslint-plugin-unicorn/prefer-structured-clone': `error`,
    'eslint-plugin-unicorn/consistent-date-clone': `error`,
    'eslint-plugin-unicorn/relative-url-style': `error`,
    // re-export directly (`export ... from`) instead of import-then-export
    'eslint-plugin-unicorn/prefer-export-from': `error`,
    'eslint-plugin-import/first': `error`,
    'eslint-plugin-import/newline-after-import': `error`,
    'oxc/branches-sharing-code': `error`,
    'eslint-plugin-vitest/prefer-to-be': `error`,
    'prefer-object-spread': `error`,
    '@typescript-eslint/prefer-for-of': `error`,
    'eslint-plugin-unicorn/prefer-string-raw': `error`,
    'eslint-plugin-unicorn/prefer-modern-math-apis': `error`,
    'eslint-plugin-unicorn/prefer-regexp-test': `error`,
    // === Tier 3: larger but worthwhile ===
    // `null: ignore` keeps the idiomatic `== null` nullish check (null OR undefined)
    eqeqeq: [`error`, `always`, { null: `ignore` }],
    '@typescript-eslint/prefer-nullish-coalescing': `error`,
    // Off: false-positives on numeric `.size`/marker-radius fields (not collections)
    'eslint-plugin-unicorn/prefer-string-replace-all': `error`,
    '@typescript-eslint/dot-notation': `error`,
    radix: `error`,
    'prefer-exponentiation-operator': `error`,
    'no-implicit-coercion': `error`,
    // named capture groups self-document regex matches; positional groups must be renamed
    'prefer-named-capture-group': `error`,
    'eslint-plugin-vitest/prefer-to-have-length': `error`,
    'eslint-plugin-vitest/require-mock-type-parameters': `off`,
    // needs manual type annotations
    'eslint-plugin-unicorn/consistent-function-scoping': `off`,
    // Svelte reactive closures
    // Pervasive intentional patterns
    '@typescript-eslint/no-unsafe-type-assertion': `off`,
    '@typescript-eslint/restrict-template-expressions': `off`,
    'no-await-in-loop': `off`,
    // Permit sorting fresh/local arrays as a standalone statement.
    'eslint-plugin-unicorn/no-array-sort': [`error`, { allowExpressionStatement: true }],
    'oxc/no-map-spread': `off`,
    'eslint-plugin-vitest/no-conditional-expect': `off`,
    // Vitest default rules — too noisy
    // Tests mock non-existent globals/DOM APIs via assignment (`globalThis.fetch = vi.fn()`,
    // `el.requestFullscreen = vi.fn()`); vi.spyOn throws on absent props and tightens mock types
    'eslint-plugin-vitest/prefer-spy-on': `off`,
    // autofix rewrites `toHaveBeenCalled()` → `toHaveBeenCalledWith()` (asserts zero args, wrong);
    // can't infer expected args, and `toHaveBeenCalled()` is the intended check in most spots
    'eslint-plugin-vitest/prefer-called-with': `off`,
    // benign barrel-file cycles (components import from their package `index.ts` that re-exports
    // them); resolving them conflicts with the `$lib/foo` barrel-import convention
    'eslint-plugin-import/no-cycle': `off`,
    'eslint-plugin-vitest/valid-expect': [`error`, { maxArgs: 2 }],
    // vitest supports expect(actual, message)
    // count any *assert*/*expect* helper as an assertion so expect-expect doesn't flag tests
    // that delegate to helpers (oxlint glob `*` matches one [a-z\d] run, so name them camelCase)
    'eslint-plugin-vitest/expect-expect': [
      `error`,
      { assertFunctionNames: [`*assert*`, `*expect*`] },
    ],
  },
  overrides: [
    {
      // vitest mock assertions like `expect(obj.method).toHaveBeenCalled()` trip
      // unbound-method (false positive on spies) and no-underscore-dangle (mock
      // internals). Relaxing them in tests is the typescript-eslint-recommended approach.
      files: [`tests/**`, `**/*.test.ts`, `**/*.test.svelte.ts`],
      rules: {
        '@typescript-eslint/unbound-method': `off`,
        'no-underscore-dangle': `off`,
      },
    },
  ],
}

const fmt: SharedConfig[`fmt`] = {
  semi: false,
  singleQuote: true,
  printWidth: 90,
  svelte: true,
}

const build: SharedConfig[`build`] = {
  // Default cssTarget is chrome111 which doesn't support light-dark(),
  cssTarget: `esnext`, // causing LightningCSS to polyfill it with broken space toggles
}

const staged: SharedConfig[`staged`] = {
  '*.{js,ts,svelte,html,css,scss,less,md,json,yaml,graphql,gql}': `vp check --fix`,
  '*.{ts,svelte}': `sh -c 'npx svelte-kit sync && npx svelte-check --threshold error'`,
}

// `staged` is not wrapped in Partial: it is an index-signature record, so a subset of
// globs already type-checks, and Partial would widen every value to `| undefined`.
export type ConfigOverrides = {
  lint?: Partial<SharedConfig[`lint`]>
  fmt?: Partial<SharedConfig[`fmt`]>
  build?: Partial<SharedConfig[`build`]>
  staged?: SharedConfig[`staged`]
}

// A factory rather than an object the caller spreads and patches: spreading a function
// trips no-misused-spread, and vite-plus JSON.stringifies these members to reach its Rust
// side, where a function value is dropped without a word.
export const make_config = (overrides: ConfigOverrides = {}): SharedConfig => ({
  lint: { ...lint, ...overrides.lint },
  fmt: { ...fmt, ...overrides.fmt },
  build: { ...build, ...overrides.build },
  staged: { ...staged, ...overrides.staged },
})
