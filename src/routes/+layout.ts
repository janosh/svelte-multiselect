import { redirect } from '@sveltejs/kit'

export const prerender = true

export const load = ({ url }) => {
  if (url.pathname.endsWith(`.md`)) {
    throw redirect(307, url.pathname.replace(/\.md$/, ``))
  }
}
