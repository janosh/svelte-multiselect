import { sveltekit } from '@sveltejs/kit/vite'
import { resolve } from 'path'

export default {
  plugins: [sveltekit()],
  test: {
    environment: `jsdom`,
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
