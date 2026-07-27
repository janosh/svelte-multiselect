import type { Option, OptionStyle } from '$lib'
import {
  chain_handlers,
  compute_position,
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

// RFC 4122 v4 is xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (y = 8/9/a/b); the timestamp+counter
// fallback used when crypto is unavailable only guarantees the generic UUID shape
const uuid_v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const uuid_any = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
test.each([
  [`crypto`, false, uuid_v4],
  [`fallback`, true, uuid_any],
] as const)(`get_uuid via %s: unique valid UUIDs`, (_desc, drop_crypto, regex) => {
  const original = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  // @ts-expect-error - mocking randomUUID as undefined
  if (drop_crypto) globalThis.crypto.randomUUID = undefined
  try {
    const uuids = Array.from({ length: 100 }, () => get_uuid())
    uuids.forEach((uuid) => expect(uuid).toMatch(regex))
    expect(new Set(uuids).size).toBe(100)
  } finally {
    if (original) globalThis.crypto.randomUUID = original
  }
})

// only letters not preceded by a letter/mark/number/underscore get capitalized
test.each([
  [`über-café`, `Über Café`], // Unicode slug words
  [`hello-world-again`, `Hello World Again`],
  [`2d-plot`, `2d Plot`], // letter after a digit stays lowercase
  [`snake_case-slug`, `Snake_case Slug`], // underscore blocks capitalization
  [`already Capitalized`, `Already Capitalized`],
  [``, ``],
])(`slug_to_title(%j) returns %j`, (slug, expected) => {
  expect(slug_to_title(slug)).toBe(expected)
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
    // spyOn, not assignment: only a spy is undone by the suite's restoreAllMocks,
    // otherwise console.error stays mocked for every later test in the file
    vi.spyOn(console, `error`).mockImplementation(() => {})
    // @ts-expect-error testing runtime behavior with non-Option types
    const result = get_label(input)
    expect(result).toBe(expected)

    if (should_log_error) {
      expect(console.error).toHaveBeenCalledWith(
        `MultiSelect: option is an object but has no label key`,
        JSON.stringify(input),
      )
    } else expect(console.error).not.toHaveBeenCalled()
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
  // `option`/`selected` logs an error, even when a valid key is also present.
  // A null/undefined key selects no sub-style but still validates the style object.
  test.each([
    [option_style, `selected`, `color: blue;`, false],
    [option_style, `option`, `color: green;`, false],
    [{ selected: `color: blue` }, `option`, ``, false],
    [{ option: `color: green` }, `selected`, ``, false],
    [{}, `option`, ``, false],
    [option_style, null, ``, false],
    [option_style, undefined, ``, false],
    [{ selected: `color: blue`, custom: `color: red` }, `selected`, `color: blue;`, true],
    [{ option: `color: green`, custom: `color: red` }, `option`, `color: green;`, true],
    [{ selected: `color: blue`, custom: `color: red` }, `option`, ``, true],
    [{ invalid_key: `some-style` }, `selected`, ``, true],
    [{ custom: `color: red` }, null, ``, true],
    [{ custom: `color: red` }, undefined, ``, true],
  ] as const)(
    `object style %j with key %s returns %j (logs error: %s)`,
    (style, key, expected, should_log_error) => {
      vi.spyOn(console, `error`).mockImplementation(() => {})
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

  test.each([
    [{ style: `color: red;` }], // string style must not leak through for unknown keys
    [{ style: option_style }],
  ])(`logs error and returns empty string for invalid key with style %j`, (option) => {
    vi.spyOn(console, `error`).mockImplementation(() => {})
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
    // non-plus keys and the remaining modifiers (alt, meta, cmd alias)
    [`k`, { key: `k`, ctrl: false, shift: false, alt: false, meta: false }],
    [`cmd+k`, { key: `k`, ctrl: false, shift: false, alt: false, meta: true }],
    [`Meta+Alt+X`, { key: `x`, ctrl: false, shift: false, alt: true, meta: true }],
    [`ctrl+shift+k`, { key: `k`, ctrl: true, shift: true, alt: false, meta: false }],
  ])(`parse_shortcut(%j)`, (shortcut, expected) => {
    expect(parse_shortcut(shortcut)).toEqual(expected)
  })

  test.each([
    [`ctrl++`, { key: `+`, ctrlKey: true }, true],
    [`ctrl++`, { key: `+`, ctrlKey: true, shiftKey: true }, true],
    [`ctrl+shift++`, { key: `+`, ctrlKey: true }, false],
    [`ctrl+`, { key: `+`, ctrlKey: true }, false],
    // the shift escape hatch is plus-only: every other modifier must match exactly
    [`cmd+k`, { key: `K`, metaKey: true }, true], // event key is lowercased
    [`cmd+k`, { key: `k`, metaKey: true, shiftKey: true }, false],
    [`cmd+k`, { key: `k`, ctrlKey: true }, false],
    [`alt+k`, { key: `k`, altKey: true }, true],
  ])(`matches_shortcut(%j) with %j`, (shortcut, event_init, expected) => {
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
    // runs collapse in the search; every whitespace char maps to a space in the target
    [`a  b`, `a b`, true],
    [`a b`, `a\tb`, true],
    [`a\tb`, `a b`, true],
    [`a b`, `a\u00A0b`, true],
    [`a b c`, `a\t\nb  c`, true],
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

describe(`compute_position`, () => {
  const viewport = (width: number, height: number) => {
    const sizes = { innerWidth: width, innerHeight: height }
    for (const [prop, value] of Object.entries(sizes)) {
      Object.defineProperty(globalThis, prop, { value, writable: true })
    }
  }
  const rect = (top: number, height: number, left = 100, width = 200) => ({
    top,
    left,
    bottom: top + height,
    right: left + width,
  })

  test(`keeps the preferred side when the box fits`, () => {
    viewport(1000, 800)
    const box = { width: 200, height: 100 }
    const placed = compute_position(rect(100, 30), box, {
      placement: `bottom`,
      offset: 8,
    })
    expect(placed).toEqual({ top: 138, left: 100, placement: `bottom` })
  })

  test(`flips to the side with room, and centre vs start line up differently`, () => {
    viewport(1000, 800)
    const anchor = rect(700, 30) // only 70px below, 700px above
    const box = { width: 300, height: 200 }

    const centered = compute_position(anchor, box, { placement: `bottom` })
    expect(centered.placement).toBe(`top`)
    expect(centered.top).toBe(500) // 700 - 200
    expect(centered.left).toBe(50) // centred on an anchor spanning 100..300

    const aligned = compute_position(anchor, box, { placement: `bottom`, align: `start` })
    expect(aligned.left).toBe(100) // flush with the anchor's left edge
  })

  test(`shift pulls the box back inside the viewport, padding included`, () => {
    viewport(400, 800)
    const anchor = rect(100, 30, 380, 20) // near the right edge
    const box = { width: 300, height: 100 }

    // flip off, else the box would simply move to the anchor's left where it fits
    const opts = { placement: `bottom`, padding: 8, flip: false } as const
    expect(compute_position(anchor, box, opts).left).toBe(92) // 400 - 300 - 8
    // centred, hanging off the right edge
    expect(compute_position(anchor, box, { ...opts, shift: false }).left).toBe(240)
  })

  // The portalled dropdown used to carry its own above/below rule. Its replacement
  // has to agree everywhere, including with the anchor scrolled out of view.
  test(`reproduces the dropdown's above/below rule across a grid`, () => {
    const view_height = 800
    viewport(1000, view_height)
    const legacy_place_above = (
      anchor: { top: number; bottom: number },
      height: number,
    ) =>
      height > 0 &&
      anchor.bottom + height > view_height &&
      anchor.top > view_height - anchor.bottom

    const mismatches: string[] = []
    for (const top of [-200, -30, 0, 50, 400, 700, 780, 900]) {
      for (const anchor_height of [0, 30, 120]) {
        for (const box_height of [1, 50, 200, 600, 1200]) {
          const anchor = rect(top, anchor_height)
          const { placement } = compute_position(
            anchor,
            { width: 200, height: box_height },
            { placement: `auto`, align: `start`, flip: [`bottom`, `top`], shift: false },
          )
          const expected = legacy_place_above(anchor, box_height) ? `top` : `bottom`
          if (placement !== expected) {
            mismatches.push(`top=${top} h=${anchor_height} box=${box_height}`)
          }
        }
      }
    }
    expect(mismatches).toEqual([])
  })
})

describe(`chain_handlers`, () => {
  test.each([
    [
      [`a`, null, `b`],
      [`a`, `b`],
    ],
    [[undefined, `a`], [`a`]],
    [[null, undefined], []],
  ])(`runs %s in order, skipping nullish`, (names, expected) => {
    const calls: string[] = []
    const handlers = names.map((name) => (name == null ? name : () => calls.push(name)))
    chain_handlers(...handlers)(new MouseEvent(`click`))
    expect(calls).toEqual(expected)
  })

  test(`passes the same event to every handler`, () => {
    const event = new MouseEvent(`click`)
    const seen: unknown[] = []
    chain_handlers(
      (evt: MouseEvent) => seen.push(evt),
      (evt: MouseEvent) => seen.push(evt),
    )(event)
    expect(seen).toEqual([event, event])
  })

  // documents a real hazard: an internal handler that throws swallows the consumer's
  test(`a throwing handler stops the chain`, () => {
    const later = vi.fn()
    const boom = () => {
      throw new Error(`boom`)
    }
    expect(() => chain_handlers(boom, later)(new MouseEvent(`click`))).toThrow(`boom`)
    expect(later).not.toHaveBeenCalled()
  })
})
