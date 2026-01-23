import type { Option, OptionStyle } from '$lib'
import {
  fuzzy_match,
  get_label,
  get_style,
  get_uuid,
  has_group,
  is_object,
} from '$lib/utils'
import { describe, expect, test, vi } from 'vitest'

describe(`get_uuid`, () => {
  // RFC 4122 v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (y = 8/9/a/b)
  const uuid_v4_regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  // UUID format without strict version/variant requirements
  const uuid_format_regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  function with_fallback<T>(fn: () => T): T {
    const original = globalThis.crypto?.randomUUID
    // @ts-expect-error - mocking randomUUID as undefined
    globalThis.crypto.randomUUID = undefined
    try {
      return fn()
    } finally {
      if (original) globalThis.crypto.randomUUID = original
    }
  }

  test(`returns valid RFC 4122 v4 UUIDs when crypto available`, () => {
    for (let idx = 0; idx < 5; idx++) expect(get_uuid()).toMatch(uuid_v4_regex)
  })

  test(`generates unique UUIDs`, () => {
    const uuids = new Set(Array.from({ length: 100 }, () => get_uuid()))
    expect(uuids.size).toBe(100)
  })

  test(`fallback produces valid unique UUIDs when crypto unavailable`, () => {
    with_fallback(() => {
      const uuids = Array.from({ length: 100 }, () => get_uuid())
      uuids.forEach((uuid) => expect(uuid).toMatch(uuid_format_regex))
      expect(new Set(uuids).size).toBe(100)
    })
  })
})

describe(`get_label`, () => {
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
    console.error = vi.fn()
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

describe(`is_object`, () => {
  test.each([
    [{ key: `value` }, true],
    [{ label: `Test` }, true],
    [{}, true],
    [[], true], // arrays are objects in JS
    [null, false],
    [undefined, false],
    [`string`, false],
    [123, false],
    [true, false],
    [() => {}, false],
  ])(`is_object(%j) returns %s`, (input, expected) => {
    expect(is_object(input)).toBe(expected)
  })
})

describe(`has_group`, () => {
  test.each([
    [{ label: `Test`, group: `Group1` }, true],
    [{ label: `Test`, group: `Frontend` }, true],
    [{ label: `Test`, group: `` }, true], // empty string is still a string
    [{ label: `Test` }, false],
    [{ label: `Test`, group: undefined }, false],
    [{ label: `Test`, group: null }, false],
    [{ label: `Test`, group: 123 }, false], // group must be string
    [{ label: `Test`, group: true }, false],
    [{ label: `Test`, group: {} }, false],
    [`plain string`, false],
    [42, false],
  ])(`has_group(%j) returns %s`, (input, expected) => {
    expect(has_group(input as Option)).toBe(expected)
  })
})
