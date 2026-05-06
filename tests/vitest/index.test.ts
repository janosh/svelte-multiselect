import * as lib from '$lib'
import * as attachments from '$lib/attachments'
import DefaultExport, {
  MultiSelect as NamedExport,
  scroll_into_view_if_needed_polyfill,
} from '$lib'
import MultiSelect from '$lib/MultiSelect.svelte'
import { describe, expect, test, vi } from 'vite-plus/test'

test(`default export from index.ts is same as component file`, () => {
  expect(DefaultExport).toBe(MultiSelect)
  expect(NamedExport).toBe(MultiSelect)
})

test(`src/lib/index.ts does not re-export attachments`, () => {
  for (const export_name of Object.keys(attachments)) {
    if (export_name === `get_uuid`) continue // also public via $lib/utils
    expect(export_name in lib).toBe(false)
  }
})

test(`src/lib/index.ts re-exports all Svelte components`, () => {
  const components = Object.keys(import.meta.glob(`$lib/*.svelte`)).map((path) =>
    path.split(`/`).pop()?.split(`.`).shift(),
  )
  expect(Object.keys(lib)).toEqual(expect.arrayContaining(components))
})

describe(`scroll_into_view_if_needed_polyfill`, () => {
  type MockState = {
    callback:
      | ((entries: IntersectionObserverEntry[], obs: IntersectionObserver) => void)
      | null
    disconnect: ReturnType<typeof vi.fn<() => void>>
    observe: ReturnType<typeof vi.fn<(element: Element) => void>>
  }

  let mock: MockState = {
    callback: null,
    disconnect: vi.fn(),
    observe: vi.fn(),
  }

  const create_mock_observer = () => {
    mock.disconnect = vi.fn<() => void>()
    mock.observe = vi.fn<(element: Element) => void>()

    class MockObserver {
      constructor(
        callback: (
          entries: IntersectionObserverEntry[],
          obs: IntersectionObserver,
        ) => void,
      ) {
        mock.callback = callback
      }
      disconnect(): void {
        mock.disconnect()
      }
      observe(element: Element): void {
        mock.observe(element)
      }
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
      unobserve(): void {}
      root = null
      rootMargin = ``
      thresholds = []
    }
    vi.stubGlobal(`IntersectionObserver`, MockObserver)
  }

  test(`creates observer and observes element`, () => {
    create_mock_observer()
    const element = document.createElement(`div`)
    const observer = scroll_into_view_if_needed_polyfill(element, true)
    expect(observer).toBeInstanceOf(Object)
    expect(mock.observe).toHaveBeenCalledWith(element)
  })

  test.each([
    // [ratio, centerIfNeeded, expectedScrollCalls]
    [0, true, [{ block: `center`, inline: `center` }]],
    [0, false, [{ block: `nearest`, inline: `nearest` }]],
    [0.5, true, [{ block: `nearest`, inline: `nearest` }]],
    [0.5, false, [{ block: `nearest`, inline: `nearest` }]],
    [1, true, []],
    [1, false, []],
  ] as const)(
    `ratio=%d centerIfNeeded=%s has scroll calls %o`,
    (ratio, center_if_needed, expected_scroll_calls) => {
      create_mock_observer()
      const element = document.createElement(`div`)
      const scroll_spy = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>()
      element.scrollIntoView = scroll_spy

      const observer = scroll_into_view_if_needed_polyfill(element, center_if_needed)
      // @ts-expect-error partial IntersectionObserverEntry mock
      mock.callback?.([{ intersectionRatio: ratio }], observer)

      expect(scroll_spy.mock.calls).toEqual(expected_scroll_calls.map((call) => [call]))
      expect(mock.disconnect).toHaveBeenCalled()
    },
  )
})
