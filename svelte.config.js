import adapter from '@sveltejs/adapter-static'
import { s } from 'hastscript'
import { mdsvex } from 'mdsvex'
import linkHeadings from 'rehype-autolink-headings'
import headingSlugs from 'rehype-slug'
import preprocess from 'svelte-preprocess'

const rehypePlugins = [
  headingSlugs,
  [
    linkHeadings,
    {
      behavior: `append`,
      test: [`h2`, `h3`, `h4`, `h5`, `h6`], // don't auto-link <h1>
      content: s(
        `svg`,
        { width: 16, height: 16, viewBox: `0 0 16 16` },
        // symbol #octicon-link defined in app.html
        s(`use`, { 'xlink:href': `#octicon-link` })
      ),
    },
  ],
]

export default {
  extensions: [`.svelte`, `.svx`, `.md`],

  preprocess: [
    preprocess(),
    mdsvex({ rehypePlugins, extensions: [`.svx`, `.md`] }),
  ],

  kit: {
    adapter: adapter(),

    prerender: { default: true },

    package: {
      // exclude auxiliary files from package.json "exports"
      exports: (filepath) =>
        [`MultiSelect.svelte`, `index.ts`, `package.json`].includes(filepath),
    },

    vite: {
      server: {
        fs: { allow: [`..`] }, // needed to import readme.md
      },
    },
  },
}
