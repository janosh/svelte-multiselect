import * as lib from '$lib'
import DefaultExport, {
  MultiSelect as NamedExport,
  scroll_into_view_if_needed_polyfill,
} from '$lib'
import MultiSelect from '$lib/MultiSelect.svelte'
import { afterEach, describe, expect, test, vi } from 'vitest'

test(`default export from index.ts is same as component file`, () => {
  expect(DefaultExport).toBe(MultiSelect)
  expect(NamedExport).toBe(MultiSelect)
})

test(`src/lib/index.ts re-exports all Svelte components`, () => {
  const components = Object.keys(import.meta.glob(`$lib/*.svelte`)).map(
    (path) => path.split(`/`).pop()?.split(`.`).shift(),
  )
  expect(Object.keys(lib)).toEqual(expect.arrayContaining(components))
})

describe(`scroll_into_view_if_needed_polyfill`, () => {
  type MockState = {
    callback:
      | ((entries: IntersectionObserverEntry[], obs: IntersectionObserver) => void)
      | null
    disconnect: ReturnType<typeof vi.fn>
    observe: ReturnType<typeof vi.fn>
    instance: { disconnect: ReturnType<typeof vi.fn> } | null
  }

  let mock: MockState = {
    callback: null,
    disconnect: vi.fn(),
    observe: vi.fn(),
    instance: null,
  }

  const create_mock_observer = () => {
    mock.disconnect = vi.fn()
    mock.observe = vi.fn()

    class MockObserver {
      constructor(
        callback: (
          entries: IntersectionObserverEntry[],
          obs: IntersectionObserver,
        ) => void,
      ) {
        mock.callback = callback
        mock.instance = this as unknown as typeof mock.instance
      }
      disconnect = mock.disconnect
      observe = mock.observe
      takeRecords = vi.fn()
      unobserve = vi.fn()
      root = null
      rootMargin = ``
      thresholds = []
    }
    vi.stubGlobal(`IntersectionObserver`, MockObserver)
  }

  afterEach(() => {
    mock = { callback: null, disconnect: vi.fn(), observe: vi.fn(), instance: null }
    vi.unstubAllGlobals()
  })

  test(`creates observer and observes element`, () => {
    create_mock_observer()
    const element = document.createElement(`div`)
    const observer = scroll_into_view_if_needed_polyfill(element, true)
    expect(observer).toBeDefined()
    expect(mock.observe).toHaveBeenCalledWith(element)
  })

  test.each(
    [
      // [ratio, centerIfNeeded, expectedBlock, shouldScroll]
      [0, true, `center`, true],
      [0, false, `nearest`, true],
      [0.5, true, `nearest`, true],
      [0.5, false, `nearest`, true],
      [1, true, null, false],
      [1, false, null, false],
    ] as const,
  )(
    `ratio=%d centerIfNeeded=%s scrolls to %s (shouldScroll=%s)`,
    (ratio, center_if_needed, expected_block, should_scroll) => {
      create_mock_observer()
      const element = document.createElement(`div`)
      element.scrollIntoView = vi.fn()

      scroll_into_view_if_needed_polyfill(element, center_if_needed)
      const mock_entry = { intersectionRatio: ratio } as IntersectionObserverEntry
      mock.callback?.([mock_entry], mock.instance as unknown as IntersectionObserver)

      if (should_scroll) {
        expect(element.scrollIntoView).toHaveBeenCalledWith({
          block: expected_block,
          inline: expected_block,
        })
      } else {
        expect(element.scrollIntoView).not.toHaveBeenCalled()
      }
      expect(mock.disconnect).toHaveBeenCalled()
    },
  )

  test(`defaults centerIfNeeded to true (scrolls to center when ratio=0)`, () => {
    create_mock_observer()
    const element = document.createElement(`div`)
    element.scrollIntoView = vi.fn()

    scroll_into_view_if_needed_polyfill(element) // no second arg
    const mock_entry = { intersectionRatio: 0 } as IntersectionObserverEntry
    mock.callback?.([mock_entry], mock.instance as unknown as IntersectionObserver)

    expect(element.scrollIntoView).toHaveBeenCalledWith({
      block: `center`,
      inline: `center`,
    })
  })
})
