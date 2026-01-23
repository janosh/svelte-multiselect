// Test that DemoNav's grouped_routes stays in sync with actual demo pages
import { DemoNav } from '$site'
import { mount } from 'svelte'
import { expect, test, vi } from 'vitest'
import { demo_pages } from '../../src/routes/(demos)'

vi.mock(`$app/state`, () => ({ page: { url: { pathname: `/` } } }))

test(`DemoNav grouped_routes contains all demo pages`, () => {
  mount(DemoNav, { target: document.body })

  // Extract all hrefs from the rendered nav (excluding group headers like #basics)
  const rendered_hrefs = Array.from(document.querySelectorAll(`nav a`))
    .map((link) => link.getAttribute(`href`))
    .filter((href) => href && !href.startsWith(`#`))

  // Filter already ensures non-null, so cast is safe
  const hrefs = rendered_hrefs as string[]
  const missing = demo_pages.filter((page) => !hrefs.includes(page))
  const extra = hrefs.filter((href) => href !== `/` && !demo_pages.includes(href))

  expect(missing, `Demo pages missing from DemoNav`).toEqual([])
  expect(extra, `Routes in DemoNav not in demo_pages`).toEqual([])
})
