import adapter from '@sveltejs/adapter-static'
import { s } from 'hastscript'
import { mdsvex } from 'mdsvex'
import mdsvexamples from 'mdsvexamples'
import link_headings from 'rehype-autolink-headings'
import heading_slugs from 'rehype-slug'
import { sveltePreprocess } from 'svelte-preprocess'

import pkg from './package.json' with { type: 'json' }

const rehypePlugins = [
  heading_slugs,
  [
    link_headings,
    {
      behavior: `append`,
      test: [`h2`, `h3`, `h4`, `h5`, `h6`], // don't auto-link <h1>
      content: s(
        `svg`,
        { width: 16, height: 16, viewBox: `0 0 16 16` },
        // symbol #octicon-link defined in app.html
        s(`use`, { 'xlink:href': `#octicon-link` }),
      ),
    },
  ],
]
const defaults = {
  Wrapper: `/src/lib/CodeExample.svelte`,
  repo: pkg.repository,
  hideStyle: true,
}
const remarkPlugins = [[mdsvexamples, { defaults }]]

/** @type {import('@sveltejs/kit').Config} */
export default {
  extensions: [`.svelte`, `.md`],

  preprocess: [
    sveltePreprocess(),
    mdsvex({ rehypePlugins, remarkPlugins, extensions: [`.md`] }),
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
      handleHttpError: ({ path: _path, referrer, message }) => {
        // Ignore 404s from the /nav demo page which contains links to non-existent routes
        if (referrer === `/nav`) return
        throw new Error(message)
      },
    },
  },

  vitePlugin: {
    inspector: true,
  },
}
