import { sveltekit } from '@sveltejs/kit/vite'
import examples from 'mdsvexamples/vite'
import { resolve } from 'path'
import type { UserConfig } from 'vite'
import type { UserConfig as VitestConfig } from 'vitest/config'

const vite_config: UserConfig & { test: VitestConfig } = {
  plugins: [sveltekit(), examples],

  test: {
    environment: `jsdom`,
    css: true,
    coverage: {
      reporter: [`text`, `json`, `html`],
    },
  },

  resolve: {
    alias: {
      $src: resolve(`./src`),
    },
  },

  server: {
    fs: { allow: [`..`] }, // needed to import readme.md
    port: 3000,
  },

  preview: {
    port: 3000,
  },
}

export default vite_config
