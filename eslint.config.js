import js from '@eslint/js'
// import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import tslint from 'typescript-eslint'

/** @type { import("eslint").Linter.FlatConfig[] } */
export default [
  js.configs.recommended,
  ...tslint.configs.recommended,
  ...svelte.configs[`flat/recommended`],
  // prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        `error`,
        { argsIgnorePattern: `^_`, varsIgnorePattern: `^_` },
      ],
      '@typescript-eslint/quotes': [`error`, `backtick`, { avoidEscape: true }],
      'svelte/no-at-html-tags': `off`,
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.es2017,
        ...globals.node,
        $$Generic: false,
      },
    },
  },
  {
    files: [`**/*.svelte`],
    languageOptions: {
      parserOptions: {
        parser: tslint.parser,
      },
    },
  },
  {
    ignores: [`build/`, `.svelte-kit/`, `package/`, `vite.config.ts.*`],
  },
]
