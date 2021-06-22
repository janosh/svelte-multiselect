import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'

import headingSlugs from 'rehype-slug'
import linkHeadings from 'rehype-autolink-headings'
import { s } from 'hastscript'

const rehypePlugins = [
  headingSlugs,
  [
    linkHeadings,
    {
      behavior: `append`,
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
  extensions: [`.svelte`, `.svx`],
  preprocess: mdsvex({ rehypePlugins }),
  kit: {
    adapter: adapter(),

    // hydrate the <body> element in src/app.html
    target: `#svelte`,

    vite: {
      ssr: { noExternal: [`svelte-toc`] },
    },
  },
}
