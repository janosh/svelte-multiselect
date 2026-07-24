import type { Pathname } from '$app/types'
import { slug_to_title } from '$lib/utils'

export const routes = Object.keys(import.meta.glob(`./**/+page.{svelte,md}`))
  .filter((filename) => !filename.includes(`/(hide)/`))
  .map((filename) => {
    const segments = filename.split(`/`)
    const group =
      segments.find((segment) => segment.startsWith(`(`))?.slice(1, -1) ?? `other`
    const parts = segments.filter((part) => !part.startsWith(`(`)) // remove hidden route segments
    const route = `/${parts.slice(1, -1).join(`/`)}` as Pathname
    return { group, route }
  })

if (routes.length < 3) {
  console.error(`Too few demo routes found: ${routes.length}`)
}

const groups = [...new Set(routes.map(({ group }) => group))].toSorted()

export const demo_nav_routes = groups.map((group) => {
  const overview_route = `/${group}` as Pathname
  const children = routes
    .filter((route) => route.group === group)
    .map(({ route }) => route)
    .toSorted((left_route, right_route) => {
      if (left_route === overview_route) return -1
      if (right_route === overview_route) return 1
      return left_route.localeCompare(right_route)
    })
  return {
    href: children[0],
    label: slug_to_title(group),
    children,
  }
})

export const demo_pages = demo_nav_routes.flatMap(({ children }) => children)
