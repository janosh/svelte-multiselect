import type { Option, OptionStyle } from '$lib'
import {
  fuzzy_match,
  get_label,
  get_option_key,
  get_style,
  get_uuid,
  has_group,
  is_object,
  matches_shortcut,
  parse_shortcut,
  slug_to_title,
} from '$lib/utils'
import { describe, expect, test, vi } from 'vite-plus/test'

describe(`get_uuid`, () => {
  // RFC 4122 v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (y = 8/9/a/b)
  const uuid_v4_regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
  // UUID format without strict version/variant requirements
  const uuid_format_regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

  function with_fallback<T>(fn: () => T): T {
    const original = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
    // @ts-expect-error - mocking randomUUID as undefined
    globalThis.crypto.randomUUID = undefined
    try {
      return fn()
    } finally {
      if (original) globalThis.crypto.randomUUID = original
    }
  }

  test(`generates unique UUIDs`, () => {
    const generated_uuids = Array.from({ length: 100 }, () => get_uuid())
    generated_uuids.forEach((uuid) => expect(uuid).toMatch(uuid_v4_regex))
    const uuids = new Set(generated_uuids)
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

test(`slug_to_title capitalizes Unicode slug words`, () => {
  expect(slug_to_title(`über-café`)).toBe(`Über Café`)
})

describe(`get_label`, () => {
  test.each([
    [{ label: `Test Label`, value: 42 }, `Test Label`, false],
    [`Simple String`, `Simple String`, false],
    [123, `123`, false],
    [null, `null`, false],
    [undefined, `undefined`, false],
    [{ value: 42, name: `Test` }, undefined, true],
  ])(`handles option %j correctly`, (input, expected, should_log_error) => {
    console.error = vi.fn<typeof console.error>()
    // @ts-expect-error testing runtime behavior with non-Option types
    const result = get_label(input)
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
  // object styles get the same trailing-semicolon normalization as string styles;
  // partial style objects (e.g. only `selected`) are fine, but any key other than
  // `option`/`selected` logs an error, even when a valid key is also present
  test.each([
    [option_style, `selected`, `color: blue;`, false],
    [option_style, `option`, `color: green;`, false],
    [{ selected: `color: blue` }, `option`, ``, false],
    [{ option: `color: green` }, `selected`, ``, false],
    [{}, `option`, ``, false],
    [{ selected: `color: blue`, custom: `color: red` }, `selected`, `color: blue;`, true],
    [{ option: `color: green`, custom: `color: red` }, `option`, `color: green;`, true],
    [{ selected: `color: blue`, custom: `color: red` }, `option`, ``, true],
    [{ invalid_key: `some-style` }, `selected`, ``, true],
  ] as const)(
    `object style %j with key %s returns %j (logs error: %s)`,
    (style, key, expected, should_log_error) => {
      console.error = vi.fn<typeof console.error>()
      const option = { label: `test`, style }
      // @ts-expect-error style objects with unknown keys test runtime validation
      expect(get_style(option, key)).toBe(expected)
      if (should_log_error) {
        expect(console.error).toHaveBeenCalledWith(
          `MultiSelect: invalid style object for option`,
          option,
        )
      } else expect(console.error).not.toHaveBeenCalled()
    },
  )

  test.each([undefined, null])(`no error for style object when key is %s`, (key) => {
    console.error = vi.fn<typeof console.error>()
    get_style({ label: `test`, style: option_style }, key)
    expect(console.error).not.toHaveBeenCalled()
  })

  test.each([
    [{ style: `color: red;` }], // string style must not leak through for unknown keys
    [{ style: option_style }],
  ])(`logs error and returns empty string for invalid key with style %j`, (option) => {
    console.error = vi.fn<typeof console.error>()
    // @ts-expect-error invalid key
    expect(get_style(option, `invalid_key`)).toBe(``)
    expect(console.error).toHaveBeenCalledWith(
      `MultiSelect: Invalid key=invalid_key for get_style`,
    )
  })
})

describe(`keyboard shortcut parsing`, () => {
  test.each([
    [`+`, { key: `+`, ctrl: false, shift: false, alt: false, meta: false }],
    [`ctrl++`, { key: `+`, ctrl: true, shift: false, alt: false, meta: false }],
    [`ctrl+shift++`, { key: `+`, ctrl: true, shift: true, alt: false, meta: false }],
    [`ctrl+`, { key: ``, ctrl: true, shift: false, alt: false, meta: false }],
  ])(`parse_shortcut(%j)`, (shortcut, expected) => {
    expect(parse_shortcut(shortcut)).toEqual(expected)
  })

  test.each([
    [`ctrl++`, { key: `+`, ctrlKey: true }, true],
    [`ctrl++`, { key: `+`, ctrlKey: true, shiftKey: true }, true],
    [`ctrl+shift++`, { key: `+`, ctrlKey: true }, false],
    [`ctrl+`, { key: `+`, ctrlKey: true }, false],
  ])(`matches_shortcut(%j) with plus key`, (shortcut, event_init, expected) => {
    const event = new KeyboardEvent(`keydown`, event_init)
    expect(matches_shortcut(event, shortcut)).toBe(expected)
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
    [`TEST`, `testing`, true],
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
    [`form submit`, `form\n submit`, true],
    [`a  b`, `a b`, true],
    // Numbers and unicode
    [`123`, `abc123def`, true],
    [`ñ`, `niño`, true],
    [`中文`, `中文测试`, true],
  ])(`fuzzy_match("%s", "%s") should return %s`, (search, target, expected) => {
    expect(fuzzy_match(search, target)).toBe(expected)
  })

  test.each([
    [null, `test`],
    [undefined, `test`],
    [`test`, null],
    [`test`, undefined],
    [null, null],
  ])(`handles null/undefined inputs fuzzy_match(%s, %s)`, (search, target) => {
    // @ts-expect-error testing runtime behavior with null/undefined
    expect(fuzzy_match(search, target)).toBe(false)
  })
})

describe(`is_object`, () => {
  test.each([
    [{ key: `value` }, true],
    [[], true], // arrays are objects in JS
    [null, false],
    [undefined, false],
    [`string`, false],
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
    // @ts-expect-error testing runtime behavior with non-Option types
    expect(has_group(input)).toBe(expected)
  })
})

describe(`get_option_key`, () => {
  test.each<[Option, unknown]>([
    // Object options with value - returns value directly (preserves identity)
    [{ label: `Apple`, value: 1 }, 1],
    [{ label: `Apple`, value: `uuid-123` }, `uuid-123`],
    [{ label: `pd`, value: `uuid-1` }, `uuid-1`],
    [{ label: `PD`, value: `uuid-2` }, `uuid-2`],
    // Object options without value - falls back to label
    [{ label: `Apple` }, `Apple`],
    [{ label: `Apple`, value: undefined }, `Apple`],
    [{ label: `Apple`, value: null }, `Apple`],
    // Object options with falsy but defined values - returns value
    [{ label: `Apple`, value: 0 }, 0],
    [{ label: `Apple`, value: `` }, ``],
    [{ label: `Apple`, value: false }, false],
    // Primitive options - returns primitive itself
    [`apple`, `apple`],
    [`Apple`, `Apple`], // case preserved
    [123, 123],
    [0, 0],
  ])(`get_option_key(%j) returns %j`, (input, expected) => {
    expect(get_option_key(input)).toBe(expected)
  })

  test(`preserves object value identity`, () => {
    const obj1 = { id: 1 }
    const obj2 = { id: 2 }
    const opt1 = { label: `Item`, value: obj1 }
    const opt2 = { label: `Item`, value: obj2 }
    // Keys are the actual objects, not stringified
    expect(get_option_key(opt1)).toBe(obj1)
    expect(get_option_key(opt2)).toBe(obj2)
    expect(get_option_key(opt1)).not.toBe(get_option_key(opt2))
  })
})
