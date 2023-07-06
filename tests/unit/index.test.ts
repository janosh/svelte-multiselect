import * as lib from '$lib'
import DefaultExport, {
  MultiSelect as NamedExport,
  scroll_into_view_if_needed_polyfill,
} from '$lib'
import MultiSelect from '$lib/MultiSelect.svelte'
import { expect, test, vi } from 'vitest'

test(`default export from index.ts is same as component file`, () => {
  expect(DefaultExport).toBe(MultiSelect)
  expect(NamedExport).toBe(MultiSelect)
})

test(`src/lib/index.ts re-exports all Svelte components`, () => {
  const components = Object.keys(import.meta.glob(`$lib/*.svelte`)).map(
    (path) => path.split(`/`).pop()?.split(`.`).shift(),
  )
  // $lib is also allowed to export other things, so we use arrayContaining()
  expect(Object.keys(lib)).toEqual(expect.arrayContaining(components))
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
  },
)
