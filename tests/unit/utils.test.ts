import type { Option, OptionStyle } from '$lib'
import { get_label, get_style, highlight_matching_nodes } from '$lib/utils'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe(`get_label`, () => {
  beforeEach(() => {
    console.error = vi.fn()
  })

  test.each([
    [{ label: `Test Label`, value: 42 }, `Test Label`, false],
    [`Simple String`, `Simple String`, false],
    [123, `123`, false],
    [null, `null`, false],
    [undefined, `undefined`, false],
    [false, `false`, false],
    [true, `true`, false],
    [0, `0`, false],
    [{ value: 42, name: `Test` }, undefined, true],
  ])(`handles option %j correctly`, (input, expected, should_log_error) => {
    const result = get_label(input as Option)
    expect(result).toBe(expected)

    if (should_log_error) {
      expect(console.error).toHaveBeenCalledWith(
        `MultiSelect option ${JSON.stringify(input)} is an object but has no label key`,
      )
    }
  })
})

describe(`get_style`, () => {
  beforeEach(() => {
    console.error = vi.fn()
  })

  test.each([
    [`plain string`, undefined, ``],
    [123, undefined, ``],
    [{ style: `color: red` }, undefined, `color: red;`],
    [{ style: `color: red;` }, undefined, `color: red;`],
    [{ style: `` }, undefined, ``],
    [{ style: `   ` }, undefined, `   `], // whitespace is preserved, not trimmed
    [{ label: `Test`, value: 42 }, undefined, ``],
  ])(`returns correct style for %j with key %s`, (option, key, expected) => {
    expect(get_style(option, key)).toBe(expected)
  })

  const option_style: OptionStyle = {
    selected: `color: blue`,
    option: `color: green`,
  }
  test.each([
    [{ style: option_style }, `selected`, `color: blue`],
    [{ style: option_style }, `option`, `color: green`],
    [{ style: { selected: `color: blue` } }, `option`, ``],
  ] as const)(
    `handles object styles correctly for %j with key %s`,
    (option, key, expected) => {
      // @ts-expect-error missing key option in last test case
      expect(get_style(option, key)).toBe(expected)
    },
  )

  test(`logs error for invalid style object without requested key`, () => {
    const option_obj = { style: { invalid_key: `some-style` } }
    // @ts-expect-error invalid key
    get_style(option_obj, `selected`)

    expect(console.error).toHaveBeenCalledWith(
      `Invalid style object for option=${JSON.stringify(option_obj)}`,
    )
  })

  test(`logs error for invalid key parameter`, () => {
    const option_obj = { style: `color: red;` }
    // @ts-expect-error invalid key
    get_style(option_obj, `invalid_key`)

    expect(console.error).toHaveBeenCalledWith(
      `MultiSelect: Invalid key=invalid_key for get_style`,
    )
  })
})

describe(`highlight_matching_nodes`, () => {
  let mock_element: HTMLElement
  let mock_css_highlights: Map<string, string>

  beforeEach(() => {
    mock_element = document.createElement(`div`)
    mock_css_highlights = new Map()

    const css_mock = {
      highlights: {
        clear: vi.fn(() => mock_css_highlights.clear()),
        set: vi.fn((key: string, value: string) =>
          mock_css_highlights.set(key, value),
        ),
      },
    }

    vi.stubGlobal(`CSS`, css_mock)
    vi.stubGlobal(
      `Highlight`,
      class MockHighlight {
        ranges: Range[]
        constructor(...ranges: Range[]) {
          this.ranges = ranges
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test.each([
    [
      `returns early if CSS.highlights not supported`,
      undefined,
      `Test content`,
      `test`,
      undefined,
      0,
      0,
    ],
    [
      `returns early if no query provided`,
      true,
      `Test content`,
      ``,
      undefined,
      0,
      0,
    ],
    [
      `highlights matching text`,
      true,
      `<p>This is a test paragraph with test words</p>`,
      `test`,
      undefined,
      1,
      1,
    ],
    [
      `skips nodes matching noMatchingOptionsMsg`,
      true,
      `<p>No matching options found</p><p>test content</p>`,
      `test`,
      `No matching options found`,
      1,
      1,
    ],
    [
      `handles multiple text nodes with matches`,
      true,
      `<div><span>first test</span><span>second test</span></div>`,
      `test`,
      undefined,
      1,
      1,
    ],
    [
      `handles case-insensitive matching`,
      true,
      `<p>Test with TEST and TeSt</p>`,
      `test`,
      undefined,
      1,
      1,
    ],
    [
      `handles no matches gracefully`,
      true,
      `<p>Content without the search term</p>`,
      `xyz`,
      undefined,
      1,
      1,
    ],
  ])(
    `%s`,
    (
      _description,
      css_supported,
      html_content,
      query,
      no_matching_msg,
      expected_clear_calls,
      expected_set_calls,
    ) => {
      if (css_supported === undefined) {
        vi.stubGlobal(`CSS`, undefined)
      }

      mock_element.innerHTML = html_content
      highlight_matching_nodes(mock_element, query, no_matching_msg)

      expect(mock_css_highlights.size).toBe(
        css_supported === undefined ? 0 : expected_set_calls,
      )

      if (css_supported) {
        expect(global.CSS.highlights.clear).toHaveBeenCalledTimes(
          expected_clear_calls,
        )
        if (expected_set_calls > 0) {
          expect(global.CSS.highlights.set).toHaveBeenCalledWith(
            `sms-search-matches`,
            expect.any(Object),
          )
        }
      }
    },
  )
})
