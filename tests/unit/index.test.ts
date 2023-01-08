import IndexMultiSelect, { scroll_into_view_if_needed_polyfill } from '$lib'
import MultiSelect from '$lib/MultiSelect.svelte'
import { expect, test, vi } from 'vitest'

test(`default export from index.ts is same as component file`, () => {
  expect(IndexMultiSelect).toBe(MultiSelect)
})

const Spy = vi.fn()
Spy.prototype.disconnect = vi.fn()
Spy.prototype.observe = vi.fn()
Spy.prototype.takeRecords = vi.fn()
Spy.prototype.unobserve = vi.fn()

vi.stubGlobal(`IntersectionObserver`, Spy)

test.each([[true, false]])(
  `scrollIntoViewIfNeeded polyfill`,
  (centerIfNeeded) => {
    expect(typeof scroll_into_view_if_needed_polyfill).toBe(`function`)
    const mock_observer = scroll_into_view_if_needed_polyfill(centerIfNeeded)
    expect(mock_observer).toBeInstanceOf(IntersectionObserver)
    expect(mock_observer.observe).toBeCalledTimes(1)
    expect(mock_observer.disconnect).toBeCalledTimes(0)
    expect(mock_observer.takeRecords).toBeCalledTimes(0)
    expect(mock_observer.unobserve).toBeCalledTimes(0)
  }
)
