import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'
import pkg from './package.json' with { type: 'json' }
import { heading_ids } from './src/lib/heading-anchors.ts'
import {
  mdsvex_transform,
  starry_night_highlighter,
} from './src/lib/live-examples/index.ts'

const remarkPlugins = [
  [
    mdsvex_transform,
    {
      defaults: {
        Wrapper: `/src/lib/CodeExample.svelte`,
        repo: pkg.repository,
        collapsible: true,
        hide_style: true,
      },
    },
  ],
]

import type { Config } from '@sveltejs/kit'

const config: Config = {
  extensions: [`.svelte`, `.md`],

  compilerOptions: {
    warningFilter: (warning) => warning.code !== `state_referenced_locally`,
  },

  preprocess: [
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
        throw new Error(`Missing ID: ${id}`)
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
