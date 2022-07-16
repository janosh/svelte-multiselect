import { sveltekit } from '@sveltejs/kit/vite'
import path from 'path'

export default {
  plugins: [sveltekit()],
  test: {
    environment: `jsdom`,
  },
  resolve: {
    alias: {
      $src: path.resolve(`./src`),
    },
  },
  server: {
    fs: { allow: [`..`] }, // needed to import readme.md
  },
}
