// Test that DemoNav stays in sync with actual demo pages
import { DemoNav } from '$site'
import { mount } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
import { routes } from '../../src/routes/(demos)'

const base = `/docs`
vi.mock(`$app/paths`, () => ({
  resolve: (path: string): string => `/docs${path}`,
}))
vi.mock(`$app/state`, () => ({ page: { url: { pathname: `/docs/` } } }))

test(`DemoNav contains all base-prefixed demo pages`, () => {
  mount(DemoNav, { target: document.body })

  // Extract all hrefs from the rendered nav (excluding group headers like #basics)
  const hrefs = Array.from(document.querySelectorAll(`nav a`)).flatMap((link) => {
    const href = link.getAttribute(`href`)
    return href && !href.startsWith(`#`) ? [href] : []
  })

  expect(new Set(hrefs)).toEqual(
    new Set([`${base}/`, ...routes.map(({ route }) => `${base}${route}`)]),
  )
})
