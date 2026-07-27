import adapter from '@sveltejs/adapter-static'
import type { Config } from '@sveltejs/kit'
import { mdsvex } from 'mdsvex'
import pkg from './package.json' with { type: 'json' }
import { heading_ids } from './src/lib/heading-anchors.ts'
import {
  mdsvex_transform,
  starry_night_highlighter,
} from './src/lib/live-examples/index.ts'

const base_segment = (process.env.BASE_PATH ?? ``).replaceAll(/^\/+|\/+$/gu, ``)
const base_path: `` | `/${string}` = base_segment ? `/${base_segment}` : ``
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

const config: Config = {
  extensions: [`.svelte`, `.md`],

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
    paths: { base: base_path },

    alias: {
      $root: `.`,
      $site: `./src/site`,
      'svelte-widgets': `./src/lib`,
    },

    prerender: {
      handleHttpError: ({ status, referrer, message }) => {
        // Ignore 404s from the /nav demo page which contains links to non-existent routes
        if (status === 404 && referrer === `${base_path}/nav`) return
        throw new Error(message)
      },
    },
  },

  vitePlugin: {
    inspector: true,
  },
}

export default config
