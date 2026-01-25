import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import { heading_ids } from './src/lib/heading-anchors.ts'
import {
  mdsvex_transform,
  starry_night_highlighter,
  sveltePreprocess,
} from './src/lib/live-examples/index.ts'

import pkg from './package.json' with { type: 'json' }
const defaults = {
  Wrapper: `/src/lib/CodeExample.svelte`,
  repo: pkg.repository,
  hideStyle: true,
}
const remarkPlugins = [[mdsvex_transform, { defaults }]]

import type { Config } from '@sveltejs/kit'

const config: Config = {
  extensions: [`.svelte`, `.md`],

  compilerOptions: {
    warningFilter: (warning) => warning.code !== `state_referenced_locally`,
  },

  preprocess: [
    sveltePreprocess(), // Wrapped to skip .md files, preserving code fence formatting
    mdsvex({
      remarkPlugins,
      extensions: [`.md`],
      highlight: { highlighter: starry_night_highlighter },
    }),
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
