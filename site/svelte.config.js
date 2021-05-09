import adapter from '@sveltejs/adapter-static'
import { mdsvex } from 'mdsvex'

export default {
  extensions: [`.svelte`, `.svx`, `.md`],
  preprocess: mdsvex({ extensions: [`.svx`, `.md`] }),
  kit: {
    adapter: adapter(),

    // hydrate the <body> element in src/app.html
    target: `body`,
  },
}
