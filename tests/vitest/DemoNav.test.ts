// Test that DemoNav's grouped_routes stays in sync with actual demo pages
import { DemoNav } from '$site'
import { mount } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
import { demo_pages } from '../../src/routes/(demos)'

const base = `/docs`
vi.mock(`$app/paths`, () => ({ base: `/docs` }))
vi.mock(`$app/state`, () => ({ page: { url: { pathname: `/docs/` } } }))

test(`DemoNav grouped_routes contains all base-prefixed demo pages`, () => {
  mount(DemoNav, { target: document.body })

  // Extract all hrefs from the rendered nav (excluding group headers like #basics)
  const hrefs = Array.from(document.querySelectorAll(`nav a`)).flatMap((link) => {
    const href = link.getAttribute(`href`)
    return href && !href.startsWith(`#`) ? [href] : []
  })

  const expected_pages = demo_pages.map((page) => `${base}${page}`)
  const missing = expected_pages.filter((page) => !hrefs.includes(page))
  const extra = hrefs.filter(
    (href) => href !== `${base}/` && !expected_pages.includes(href),
  )

  expect(missing, `Demo pages missing from DemoNav`).toEqual([])
  expect(extra, `Routes in DemoNav not in demo_pages`).toEqual([])
})
