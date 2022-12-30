import IndexMultiSelect, { scroll_into_view_if_needed_polyfill } from '$lib'
import MultiSelect from '$lib/MultiSelect.svelte'
import { expect, test, vi } from 'vitest'

test(`default export from index.ts is same as component file`, () => {
  expect(IndexMultiSelect).toBe(MultiSelect)
})

class MockIntersectionObserver implements IntersectionObserver {
  root: Document | Element | null = null
  rootMargin: string = ``
  thresholds: readonly number[] = []

  disconnect = vi.fn()
  observe = vi.fn()
  takeRecords = vi.fn()
  unobserve = vi.fn()
}

test.each([[true, false]])(
  `scrollIntoViewIfNeeded polyfill`,
  (centerIfNeeded) => {
    expect(typeof scroll_into_view_if_needed_polyfill).toBe(`function`)
    window.IntersectionObserver = MockIntersectionObserver
    const mock_observer = scroll_into_view_if_needed_polyfill(centerIfNeeded)
    expect(mock_observer).toBeInstanceOf(MockIntersectionObserver)
    expect(mock_observer.observe).toBeCalledTimes(1)
    expect(mock_observer.disconnect).toBeCalledTimes(0)
  }
)
