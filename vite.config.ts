import { sveltekit } from '@sveltejs/kit/vite'
import { resolve } from 'path'

export default {
  plugins: [sveltekit()],
  test: {
    environment: `jsdom`,
    deps: {
      inline: [`compute-scroll-into-view`],
    },
  },
  resolve: {
    alias: {
      $src: resolve(`./src`),
    },
  },
  server: {
    fs: { allow: [`..`] }, // needed to import readme.md
  },
}
