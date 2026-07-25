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
  const attachment_names = Object.keys(attachments)
  // without this, an empty attachments module would satisfy the filter vacuously
  expect(attachment_names).toContain(`tooltip`)
  expect(attachment_names.filter((export_name) => export_name in lib)).toEqual([])
})

test(`src/lib/index.ts re-exports all Svelte components`, () => {
  const components = Object.keys(import.meta.glob(`$lib/*.svelte`)).map((path) =>
    path.split(`/`).pop()?.split(`.`).shift(),
  )
  // an empty glob would make arrayContaining([]) trivially true
  expect(components).toEqual(expect.arrayContaining([`MultiSelect`, `Toggle`, `Icon`]))
  expect(components.filter((name) => !(name && name in lib))).toEqual([])
})

describe(`scroll_into_view_if_needed_polyfill`, () => {
  type ObserverCallback = (
    entries: IntersectionObserverEntry[],
    obs: IntersectionObserver,
  ) => void

  const observe = vi.fn<(element: Element) => void>()
  const disconnect = vi.fn<() => void>()
  let notify: ObserverCallback | null = null

  const create_mock_observer = () => {
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal(
      `IntersectionObserver`,
      class {
        observe = observe
        disconnect = disconnect
        constructor(callback: ObserverCallback) {
          notify = callback
        }
      },
    )
  }

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
      expect(observe).toHaveBeenCalledWith(element)
      // @ts-expect-error partial IntersectionObserverEntry mock
      notify?.([{ intersectionRatio: ratio }], observer)

      expect(scroll_spy.mock.calls).toEqual(expected_scroll_calls.map((call) => [call]))
      expect(disconnect).toHaveBeenCalled()
    },
  )
})
