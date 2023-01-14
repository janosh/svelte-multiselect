import { redirect } from '@sveltejs/kit'
import type { LayoutLoad } from './$types'

export const prerender = true

export const load: LayoutLoad = ({ url }) => {
  if (url.pathname.endsWith(`.md`)) {
    throw redirect(307, url.pathname.replace(/\.md$/, ``))
  }
}
