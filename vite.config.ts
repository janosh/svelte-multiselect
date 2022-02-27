import { svelte } from '@sveltejs/vite-plugin-svelte'

export default {
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    environment: `jsdom`,
  },
}
