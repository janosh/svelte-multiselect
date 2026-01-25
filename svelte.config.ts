import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import { sveltePreprocess } from 'svelte-preprocess'
import { heading_ids } from './src/lib/heading-anchors.ts'
import live_examples from './src/lib/live-examples/remark.ts'

import pkg from './package.json' with { type: 'json' }
const defaults = {
  Wrapper: `/src/lib/CodeExample.svelte`,
  repo: pkg.repository,
  hideStyle: true,
}
const remarkPlugins = [[live_examples, { defaults }]]

import type { Config } from '@sveltejs/kit'

const config: Config = {
  extensions: [`.svelte`, `.md`],

  compilerOptions: {
    warningFilter: (warning) => warning.code !== `state_referenced_locally`,
  },

  preprocess: [
    sveltePreprocess(),
    mdsvex({ remarkPlugins, extensions: [`.md`] }),
    heading_ids(),
  ],

  kit: {
    adapter: adapter(),

    alias: {
      $root: `.`,
      $site: `./src/site`,
      'svelte-multiselect': `./src/lib`,
    },

    prerender: {
      handleMissingId: ({ id }) => {
        // list of ok-to-be-missing IDs
        if ([`🔣-props`].includes(id)) return
        throw `Missing ID: ${id}`
      },
      handleHttpError: ({ status, referrer, message }) => {
        // Ignore 404s from the /nav demo page which contains links to non-existent routes
        if (status === 404 && referrer === `/nav`) return
        throw new Error(message)
      },
    },
  },

  vitePlugin: {
    inspector: true,
  },
}

export default config
