import type { Option, OptionStyle } from '$lib'
import { fuzzy_match, get_label, get_style } from '$lib/utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

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
        `MultiSelect: option is an object but has no label key`,
        JSON.stringify(input),
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
    // @ts-expect-error testing with mixed types for get_style
    expect(get_style(option, key)).toBe(expected)
  })

  const option_style: OptionStyle = {
    selected: `color: blue`,
    option: `color: green`,
  }
  test.each(
    [
      [{ style: option_style }, `selected`, `color: blue`],
      [{ style: option_style }, `option`, `color: green`],
      [{ style: { selected: `color: blue` } }, `option`, ``],
    ] as const,
  )(
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
      `MultiSelect: invalid style object for option`,
      option_obj,
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

describe(`fuzzy_match`, () => {
  test.each([
    // Basic cases
    [``, ``, true],
    [``, `anything`, true],
    [`test`, ``, false],
    [`test`, `test`, true],
    [`test`, `testing`, true],
    [`test`, `best`, false],
    // Case insensitive
    [`TEST`, `test`, true],
    [`Test`, `tEsT`, true],
    // Fuzzy matching (non-consecutive)
    [`tageoo`, `tasks/geo-opt`, true],
    [`abc`, `a-b-c`, true],
    [`abc`, `a-b-d`, false],
    [`abc`, `a-b-c-d`, true],
    [`hello`, `h-e-l-l-o`, true],
    [`hello`, `h-e-l-o`, false],
    // Repeated characters
    [`aa`, `banana`, true],
    [`aaa`, `banana`, true],
    [`aaaa`, `banana`, false],
    // Special characters
    [`@`, `@user`, true],
    [`#`, `#hashtag`, true],
    [`/`, `path/to/file`, true],
    // Numbers and unicode
    [`123`, `abc123def`, true],
    [`ñ`, `niño`, true],
    [`中文`, `中文测试`, true],
  ])(`fuzzy_match("%s", "%s") should return %s`, (search, target, expected) => {
    expect(fuzzy_match(search, target)).toBe(expected)
  })

  test(`handles null/undefined inputs`, () => {
    // @ts-expect-error testing runtime behavior
    expect(fuzzy_match(null, `test`)).toBe(false)
    // @ts-expect-error testing runtime behavior
    expect(fuzzy_match(undefined, `test`)).toBe(false)
  })
})
