import { heading_anchors, heading_ids } from '$lib/heading-anchors'
import { describe, expect, it } from 'vite-plus/test'
import { doc_query } from './index'

const preprocess = (content: string, filename?: string) =>
  heading_ids().markup({ content, filename })

// Decoded independently of the encoder under test, so a self-consistent but wrong
// encoding can't pass. Yields [generated_column, source_line, source_column] per segment.
const decode_mappings = (mappings: string): [number, number, number][][] => {
  const base64 = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/`
  let source_line = 0
  let source_column = 0
  return mappings.split(`;`).map((line) => {
    let generated_column = 0
    return line
      .split(`,`)
      .filter(Boolean)
      .map((segment) => {
        const values: number[] = []
        let shift = 0
        let accumulated = 0
        for (const char of segment) {
          const digit = base64.indexOf(char)
          accumulated += (digit & 31) << shift
          if (digit & 32) shift += 5
          else {
            values.push(accumulated & 1 ? -(accumulated >> 1) : accumulated >> 1)
            shift = 0
            accumulated = 0
          }
        }
        generated_column += values[0]
        source_line += values[2]
        source_column += values[3]
        return [generated_column, source_line, source_column] as [number, number, number]
      })
  })
}

describe(`heading_ids preprocessor`, () => {
  it(`emits map metadata pointing at the original component`, () => {
    const source = `<h2>A</h2>\n<h2>B</h2>`
    const { map } = preprocess(source, `Heading.svelte`)
    expect(map).toEqual({
      version: 3,
      names: [],
      sources: [`Heading.svelte`],
      sourcesContent: [source],
      mappings: expect.any(String),
    })
  })

  // an inaccurate map sends every downstream diagnostic to the wrong place
  it.each([
    [`one heading per line`, `<h2>A</h2>\n<h2>B</h2>`],
    [`indented heading`, `<div>\n  <h2>Nested</h2>\n</div>`],
    [`two headings on one line`, `<div><h2>One</h2> <h3>Two</h3></div>`],
    [`content trailing the heading`, `<h2>Title</h2> trailing text here`],
    [`non-ASCII heading text`, `<p>x</p>\n<h2>Über Café</h2>\n<p>after</p>`],
    [`heading that already has an id`, `<h2 id="keep">A</h2>\n<h2>B</h2>`],
    [`mdsvex single-line output`, `<p>a</p> <h2>First</h2> <p>b</p> <h3>Second</h3>`],
    [`no headings at all`, `<p>nothing to do</p>\n<span>x</span>`],
    [`script below the heading`, `<h2>Docs</h2>\n<script>\n  let count = 1\n</script>`],
  ])(`maps every unchanged span back to its original text (%s)`, (_label, source) => {
    const { code, map } = preprocess(source, `T.svelte`)
    const generated_lines = code.split(`\n`)
    const source_lines = source.split(`\n`)
    const decoded = decode_mappings(map.mappings)
    // else empty mappings would make the span assertions below vacuously pass
    expect(decoded).toHaveLength(source_lines.length)

    let mapped_insertions = 0
    for (const [line_idx, segments] of decoded.entries()) {
      const generated_line = generated_lines[line_idx]
      const source_line = source_lines[line_idx]
      segments.forEach(([generated_column, mapped_line, mapped_column], seg_idx) => {
        const span_end = segments[seg_idx + 1]?.[0] ?? generated_line.length
        const generated = generated_line.slice(generated_column, span_end)
        // the inserted attribute is the one span with no counterpart in the original
        if (/^ id="[^"]*"$/u.test(generated)) {
          mapped_insertions++
          return
        }
        const original = source_lines[mapped_line].slice(
          mapped_column,
          mapped_column + generated.length,
        )
        expect(original, `line ${line_idx} col ${generated_column}`).toBe(generated)
      })

      // A shifted line (only insertions change length) must close with a segment mapping
      // its new end to the original, else end-of-line resolves to the pre-shift column.
      if (generated_line.length !== source_line.length) {
        const last_segment = segments.at(-1)
        expect([last_segment?.[0], last_segment?.[2]], `line ${line_idx} end`).toEqual([
          generated_line.length,
          source_line.length,
        ])
      }
    }
    // every inserted id must appear as its own span, so dropping them can't pass
    const count_ids = (text: string) => (text.match(/ id="/gu) ?? []).length
    expect(mapped_insertions).toBe(count_ids(code) - count_ids(source))
  })

  it.each([
    [`<h2>Hello World</h2>`, `<h2 id="hello-world">Hello World</h2>`],
    [`<h6>Sixth Level</h6>`, `<h6 id="sixth-level">Sixth Level</h6>`],
    [`<h1>Title</h1>`, `<h1 id="title">Title</h1>`],
    [`<h2>Hello! World? Yes.</h2>`, `<h2 id="hello-world-yes">Hello! World? Yes.</h2>`],
    [`<h2>Über Café</h2>`, `<h2 id="über-café">Über Café</h2>`],
    [`<h2>✨ Styling</h2>`, `<h2 id="styling">✨ Styling</h2>`], // emoji stripped
    [
      `<h2>Multi\nLine\nContent</h2>`,
      `<h2 id="multi-line-content">Multi\nLine\nContent</h2>`,
    ],
    // existing attributes are preserved, the id is inserted first
    [`<h2 data-id="foo">Hello</h2>`, `<h2 id="hello" data-id="foo">Hello</h2>`],
    [
      `<h2 on:click={handler}>Clickable</h2>`,
      `<h2 id="clickable" on:click={handler}>Clickable</h2>`,
    ],
    // Svelte expressions are stripped from the slug source but kept in the markup
    [`<h2>{greeting} World</h2>`, `<h2 id="world">{greeting} World</h2>`],
    [`<h2>{first} and {second}</h2>`, `<h2 id="and">{first} and {second}</h2>`],
    [
      `<h2>Result {fn({a: {b: {c: 1}}})}</h2>`,
      `<h2 id="result">Result {fn({a: {b: {c: 1}}})}</h2>`,
    ],
    // unmatched } treated as literal (not dropped) to avoid losing content when depth would go negative
    [`<h2>Price: $100}</h2>`, `<h2 id="price-100">Price: $100}</h2>`],
    [`<h2>a } b</h2>`, `<h2 id="a-b">a } b</h2>`], // } kept in text, stripped by slugify
    // inline headings (mdsvex output)
    [`</p> <h2>Title</h2>`, `</p> <h2 id="title">Title</h2>`],
    [
      `</p><h2>First</h2></section><h3>Second</h3>`,
      `</p><h2 id="first">First</h2></section><h3 id="second">Second</h3>`,
    ],
    [
      `</p><h2>First</h2><h2>Second</h2>`,
      `</p><h2 id="first">First</h2><h2 id="second">Second</h2>`,
    ],
    // text of nested HTML tags contributes to the slug
    [
      `<h2>Using <code>someFunction</code></h2>`,
      `<h2 id="using-somefunction">Using <code>someFunction</code></h2>`,
    ],
  ])(`%s → %s`, (input: string, expected: string) => {
    expect(preprocess(input).code).toBe(expected)
  })

  it.each([
    `<h2 id="">Empty ID</h2>`, // an existing id, even empty, is never replaced
    `<h2 class="test" id="existing" data-foo="bar">Text</h2>`,
    `<h2>{dynamicOnly}</h2>`, // no static text → no id
    `<h2><span></span></h2>`,
    // leading } preserved in text, but after stripping {test} only } remains which slugifies to empty
    `<h2>}{test}</h2>`,
  ])(`leaves %s unchanged`, (input: string) => {
    expect(preprocess(input).code).toBe(input)
  })

  it(`handles duplicate headings with -1, -2 suffixes`, () => {
    const result = preprocess(
      `<h2>Foo</h2>\n<h2>Foo</h2>\n<h3>Foo</h3>\n<h2>Bar</h2>\n<h2>Foo</h2>\n<h2>Café</h2>\n<h2>Cafe\u0301</h2>`,
    )
    // exact output pins which heading gets which suffix: the counter is shared
    // across tags (h3 takes foo-2) and NFC normalization makes the decomposed
    // `Cafe\u0301` a duplicate of `Café` while leaving the heading text untouched
    expect(result.code).toBe(
      `<h2 id="foo">Foo</h2>\n<h2 id="foo-1">Foo</h2>\n<h3 id="foo-2">Foo</h3>\n` +
        `<h2 id="bar">Bar</h2>\n<h2 id="foo-3">Foo</h2>\n<h2 id="café">Café</h2>\n` +
        `<h2 id="café-1">Cafe\u0301</h2>`,
    )
  })
})

describe(`heading_anchors attachment`, () => {
  // production attaches to <main>; the default selector uses :scope so headings are
  // matched relative to the attached node (h1-h6 as direct or 2nd-level children)
  const create_container = (html = ``) => {
    document.body.innerHTML = `<main>${html}</main>`
    return doc_query(`main`)
  }
  const anchor_selector = `a[aria-hidden="true"]`
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

  it.each([`h2`, `h6`])(`adds anchor as last child of %s`, (tag: string) => {
    const container = create_container(`<${tag} id="test">T <span>x</span></${tag}>`)
    heading_anchors()(container)
    const anchor = container.querySelector(`${tag} ${anchor_selector}`)
    expect(anchor).toBeInstanceOf(HTMLAnchorElement)
    expect(anchor?.getAttribute(`href`)).toBe(`#test`)
    // appended after existing children rather than prepended or replacing them
    expect(container.querySelector(tag)?.lastElementChild).toBe(anchor)
  })

  it(`handles multiple headings and prevents duplicates`, () => {
    const container = create_container(
      `<h1 id="title">Title</h1><h2 id="one">One</h2><h3 id="two">Two</h3>`,
    )
    heading_anchors()(container)
    heading_anchors()(container) // call twice to test duplicate prevention
    expect(container.querySelectorAll(anchor_selector)).toHaveLength(3)
  })

  it.each([
    [`sibling headings`, `<h2>Same</h2><h3>Same</h3>`, [`same`, `same-1`]],
    // querySelector('#2024-roadmap') throws SyntaxError since CSS ID selectors
    // can't start with an unescaped digit - uniqueness check must use getElementById
    [
      `digit-leading text (invalid as CSS ID selector)`,
      `<h2>2024 Roadmap</h2><h3>2024 Roadmap</h3>`,
      [`2024-roadmap`, `2024-roadmap-1`],
    ],
    // guards get_default_headings ordering: a direct-child heading must be processed
    // before a grandchild in a later sibling, so the duplicate suffix lands on the grandchild
    [
      `direct child before a later sibling's grandchild`,
      `<h2>Dup</h2><div><h3>Dup</h3></div>`,
      [`dup`, `dup-1`],
    ],
  ])(`auto-generates unique ids: %s`, (_desc, html, expected_ids) => {
    const container = create_container(html)
    expect(() => heading_anchors()(container)).not.toThrow()
    const ids = Array.from(container.querySelectorAll(`h2, h3`)).map((el) => el.id)
    expect(ids).toEqual(expected_ids)
    expect(container.querySelectorAll(anchor_selector)).toHaveLength(2)
  })

  it(`skips headings with no usable text`, () => {
    const container = create_container(`<h2></h2>`)
    heading_anchors()(container)
    const heading = doc_query(`h2`)
    expect(heading.querySelector(`a`)).toBeNull()
    expect(heading.id).toBe(``) // no id invented for text-less headings
  })

  it(`adds anchors to dynamically inserted headings`, async () => {
    const container = create_container()
    heading_anchors()(container)
    const wrapper = document.createElement(`div`)
    wrapper.innerHTML = `<h3 id="dynamic">X</h3>`
    container.append(wrapper)
    // the anchor must arrive via the observer callback, not synchronously
    expect(container.querySelector(anchor_selector)).toBeNull()
    await tick()
    expect(container.querySelector(`h3 ${anchor_selector}`)?.getAttribute(`href`)).toBe(
      `#dynamic`,
    )
  })

  it(`cleanup disconnects observer and stops processing`, async () => {
    const container = create_container()
    const cleanup = heading_anchors({ selector: `h2` })(container)
    expect(cleanup).toBeTypeOf(`function`)

    // prove the observer is live first, else the absence of anchors after cleanup
    // is equally explained by the attachment never having worked
    const before_cleanup = document.createElement(`h2`)
    before_cleanup.id = `before`
    container.append(before_cleanup)
    await tick()
    expect(before_cleanup.querySelector(anchor_selector)).not.toBeNull()

    cleanup?.()

    // verify no anchors added after cleanup
    const heading = document.createElement(`h2`)
    heading.id = `after`
    container.append(heading)
    await tick()
    expect(heading.querySelector(anchor_selector)).toBeNull()
  })

  it(`custom selector filters headings`, () => {
    const container = create_container(
      `<h2 id="plain">Plain</h2><h2 id="anchored" class="anchored">Anchored</h2>`,
    )
    heading_anchors({ selector: `h2.anchored` })(container)
    expect(container.querySelector(`#plain ${anchor_selector}`)).toBeNull()
    expect(container.querySelector(`#anchored ${anchor_selector}`)).toBeInstanceOf(
      HTMLAnchorElement,
    )
  })

  it(`icon_svg customizes icon, default has aria-label`, () => {
    const container = create_container(`<h2 id="t1">T1</h2><h3 id="t2">T2</h3>`)
    heading_anchors({ selector: `#t1`, icon_svg: `<svg class="custom"></svg>` })(
      container,
    )
    heading_anchors({ selector: `#t2` })(container)
    expect(container.querySelector(`#t1 ${anchor_selector} .custom`)).toBeInstanceOf(
      Element,
    )
    // custom icon replaces the default one rather than being added alongside it
    expect(container.querySelectorAll(`#t1 svg`)).toHaveLength(1)
    expect(container.querySelector(`#t1 svg[aria-label]`)).toBeNull()
    expect(container.querySelector(`#t2 ${anchor_selector}`)?.innerHTML).toContain(
      `aria-label`,
    )
  })

  it(`returns undefined in SSR (no document)`, () => {
    const dummy = document.createElement(`div`)
    const original = globalThis.document
    Object.defineProperty(globalThis, `document`, {
      value: undefined,
      configurable: true,
    })
    try {
      expect(heading_anchors()(dummy)).toBeUndefined()
    } finally {
      Object.defineProperty(globalThis, `document`, {
        value: original,
        configurable: true,
      })
    }
  })

  const deeply_nested = `<div><section><h2 id="deep">X</h2></section></div>`
  it.each<[string, string, string | undefined, string | null]>([
    // the default selector uses :scope, so it reaches direct children and grandchildren only
    [`direct child`, `<h2 id="dc">X</h2>`, undefined, `#dc`],
    [`2nd-level (grandchild)`, `<div><h2 id="gc">X</h2></div>`, undefined, `#gc`],
    [`3rd-level (too deep)`, deeply_nested, undefined, null],
    [`3rd-level via custom selector`, deeply_nested, `h2`, `#deep`],
    // an explicit id is used verbatim, even when the heading text is only whitespace
    [`whitespace text with id`, `<h2 id="spaces">   </h2>`, undefined, `#spaces`],
  ])(`anchors a heading: %s`, (_desc, html, selector, expected_href) => {
    const container = create_container(html)
    heading_anchors({ selector })(container)
    const href = container.querySelector(anchor_selector)?.getAttribute(`href`) ?? null
    expect(href).toBe(expected_href)
  })
})
