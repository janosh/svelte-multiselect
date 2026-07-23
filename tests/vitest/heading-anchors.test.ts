import { heading_anchors, heading_ids } from '$lib/heading-anchors'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { doc_query } from './index'

const preprocess = (content: string, filename?: string) =>
  heading_ids().markup({ content, filename })

describe(`heading_ids preprocessor`, () => {
  it(`maps original markup exactly across inserted IDs`, () => {
    const source = `<h2>A</h2>\n<h2>B</h2>`
    expect(preprocess(source, `Heading.svelte`).map).toEqual({
      version: 3,
      names: [],
      sources: [`Heading.svelte`],
      sourcesContent: [source],
      mappings: `AAAA,GAAG,OAAA;AACH,GAAG,OAAA`,
    })
  })

  describe(`basic ID generation`, () => {
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
    ])(`%s → %s`, (input: string, expected: string) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  describe(`skip existing IDs`, () => {
    it.each([
      [`<h2 id="">Empty ID</h2>`],
      [`<h2 class="test" id="existing" data-foo="bar">Text</h2>`],
    ])(`preserves: %s`, (input: string) => {
      expect(preprocess(input).code).toBe(input)
    })
  })

  describe(`preserves/adds attributes correctly`, () => {
    it.each([
      [`<h2 data-id="foo">Hello</h2>`, `<h2 id="hello" data-id="foo">Hello</h2>`],
      [
        `<h2 class="test" data-test="foo">Title</h2>`,
        `<h2 id="title" class="test" data-test="foo">Title</h2>`,
      ],
      [
        `<h2 on:click={handler}>Clickable</h2>`,
        `<h2 id="clickable" on:click={handler}>Clickable</h2>`,
      ],
    ])(`%s → %s`, (input: string, expected: string) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  it(`handles duplicate headings with -1, -2 suffixes`, () => {
    const result = preprocess(
      `<h2>Foo</h2>\n<h2>Foo</h2>\n<h3>Foo</h3>\n<h2>Bar</h2>\n<h2>Foo</h2>\n<h2>Café</h2>\n<h2>Cafe\u0301</h2>`,
    )
    expect(result.code).toContain(`id="foo"`)
    expect(result.code).toContain(`id="foo-1"`)
    expect(result.code).toContain(`id="foo-2"`)
    expect(result.code).toContain(`id="foo-3"`)
    expect(result.code).toContain(`id="bar"`)
    expect(result.code).toContain(`id="café"`)
    expect(result.code).toContain(`id="café-1"`)
  })

  describe(`strip Svelte expressions`, () => {
    it.each([
      [`<h2>{greeting} World</h2>`, `<h2 id="world">{greeting} World</h2>`],
      [`<h2>{first} and {second}</h2>`, `<h2 id="and">{first} and {second}</h2>`],
      [
        `<h2>Result {fn({a: {b: {c: 1}}})}</h2>`,
        `<h2 id="result">Result {fn({a: {b: {c: 1}}})}</h2>`,
      ],
      // unmatched } treated as literal (not dropped) to avoid losing content when depth would go negative
      [`<h2>Price: $100}</h2>`, `<h2 id="price-100">Price: $100}</h2>`],
      // leading } preserved in text, but after stripping {test} only } remains which slugifies to empty → no id added
      [`<h2>}{test}</h2>`, `<h2>}{test}</h2>`],
      [`<h2>a } b</h2>`, `<h2 id="a-b">a } b</h2>`], // } kept in text, stripped by slugify
    ])(`%s → %s`, (input: string, expected: string) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  describe(`skip empty/dynamic-only headings`, () => {
    it.each([[`<h2>{dynamicOnly}</h2>`], [`<h2><span></span></h2>`]])(
      `unchanged: %s`,
      (input: string) => {
        expect(preprocess(input).code).toBe(input)
      },
    )
  })

  describe(`inline headings (mdsvex output)`, () => {
    it.each([
      [`</p> <h2>Title</h2>`, `</p> <h2 id="title">Title</h2>`],
      [
        `</p><h2>First</h2></section><h3>Second</h3>`,
        `</p><h2 id="first">First</h2></section><h3 id="second">Second</h3>`,
      ],
    ])(`%s → %s`, (input: string, expected: string) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  describe(`headings with HTML tags inside`, () => {
    it.each([
      [
        `<h2>Using <code>someFunction</code></h2>`,
        `<h2 id="using-somefunction">Using <code>someFunction</code></h2>`,
      ],
    ])(`%s → %s`, (input: string, expected: string) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })
})

describe(`heading_anchors attachment`, () => {
  // Default selector uses :scope to target children relative to the attached node
  // In production, the attachment is applied directly to <main> elements
  const create_container = (html = ``, wrapper: `main` | `div` | `none` = `main`) => {
    document.body.innerHTML =
      wrapper === `none` ? html : `<${wrapper}>${html}</${wrapper}>`
    // Return the wrapper element (matching production usage of attaching to <main>)
    return wrapper === `none` ? document.body : doc_query(wrapper)
  }
  const anchor_selector = `a[aria-hidden="true"]`
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

  beforeEach(() => {
    document.body.innerHTML = ``
  })

  describe(`adds anchors to headings`, () => {
    // Default selector includes h1-h6 as direct or 2nd-level children of main
    it.each([`h2`, `h6`])(`adds anchor to %s`, (tag: string) => {
      const container = create_container(`<${tag} id="test">Content</${tag}>`)
      heading_anchors()(container)
      const anchor = container.querySelector(`${tag} ${anchor_selector}`)
      expect(anchor).toBeInstanceOf(HTMLAnchorElement)
      expect(anchor?.getAttribute(`href`)).toBe(`#test`)
    })

    it(`handles multiple headings and prevents duplicates`, () => {
      const container = create_container(
        `<h1 id="title">Title</h1><h2 id="one">One</h2><h3 id="two">Two</h3>`,
      )
      heading_anchors()(container)
      heading_anchors()(container) // call twice to test duplicate prevention
      expect(container.querySelectorAll(anchor_selector)).toHaveLength(3)
    })
  })

  describe(`generates IDs for headings without them`, () => {
    it(`generates unique IDs`, () => {
      const container = create_container(`<h2>Same</h2><h3>Same</h3>`)
      heading_anchors()(container)
      const ids = Array.from(container.querySelectorAll(`h1, h2, h3`)).map((el) => el.id)
      expect(ids).toEqual([`same`, `same-1`])
    })

    it(`skips headings with no usable text`, () => {
      const container = create_container(`<h2></h2>`)
      heading_anchors()(container)
      expect(container.querySelector(`h2 a`)).toBeNull()
    })

    it(`handles digit-leading heading text without throwing (invalid as CSS ID selector)`, () => {
      // querySelector('#2024-roadmap') throws SyntaxError since CSS ID selectors
      // can't start with an unescaped digit - uniqueness check must use getElementById
      const container = create_container(`<h2>2024 Roadmap</h2><h3>2024 Roadmap</h3>`)
      expect(() => heading_anchors()(container)).not.toThrow()
      const ids = Array.from(container.querySelectorAll(`h2, h3`)).map((el) => el.id)
      expect(ids).toEqual([`2024-roadmap`, `2024-roadmap-1`])
      expect(container.querySelectorAll(anchor_selector)).toHaveLength(2)
    })
  })

  describe(`default selector targets attached node children`, () => {
    it.each<[string, string, string, boolean]>([
      [`direct child`, `<h2 id="dc">X</h2>`, `#dc`, true],
      [`2nd-level (grandchild)`, `<div><h2 id="gc">X</h2></div>`, `#gc`, true],
      [
        `3rd-level (too deep)`,
        `<div><section><h2 id="deep">X</h2></section></div>`,
        `#deep`,
        false,
      ],
    ])(`%s → matched: %s`, (_desc, html, id_sel, should_match) => {
      const container = create_container(html)
      heading_anchors()(container)
      const anchor = document.querySelector(`${id_sel} ${anchor_selector}`)
      if (should_match) expect(anchor).toBeInstanceOf(HTMLAnchorElement)
      else expect(anchor).toBeNull()
    })

    it(`processes direct child before a later sibling's grandchild (duplicate-id order)`, () => {
      // guards get_default_headings ordering: a direct-child heading must be processed
      // before a grandchild in a later sibling, so the duplicate suffix lands on the grandchild
      const container = create_container(`<h2>Dup</h2><div><h3>Dup</h3></div>`)
      heading_anchors()(container)
      const ids = Array.from(container.querySelectorAll(`h2, h3`)).map((el) => el.id)
      expect(ids).toEqual([`dup`, `dup-1`])
    })
  })

  describe(`MutationObserver for dynamic content`, () => {
    it(`adds anchors to dynamically inserted headings`, async () => {
      const container = create_container()
      heading_anchors()(container)
      const wrapper = document.createElement(`div`)
      wrapper.innerHTML = `<h3 id="dynamic">X</h3>`
      container.append(wrapper)
      await tick()
      expect(document.querySelector(anchor_selector)).toBeInstanceOf(HTMLAnchorElement)
    })
  })

  describe(`cleanup function`, () => {
    it(`disconnects observer and stops processing`, async () => {
      // Use isolated container with custom selector to avoid interference from other tests
      const container = document.createElement(`div`)
      document.body.append(container)
      const cleanup = heading_anchors({ selector: `h2` })(container)
      expect(cleanup).toBeTypeOf(`function`)
      cleanup?.()

      // verify no anchors added after cleanup
      const heading = document.createElement(`h2`)
      heading.id = `after`
      container.append(heading)
      await tick()
      expect(heading.querySelector(anchor_selector)).toBeNull()
    })
  })

  describe(`options`, () => {
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
      expect(container.querySelector(`#t2 ${anchor_selector}`)?.innerHTML).toContain(
        `aria-label`,
      )
    })
  })

  it(`anchor has correct href, aria-hidden, and is appended last`, () => {
    const container = create_container(
      `<h2 id="my-heading">Test <span>Content</span></h2>`,
    )
    heading_anchors()(container)
    const anchor = container.querySelector(`h2 a`)
    expect(anchor?.getAttribute(`href`)).toBe(`#my-heading`)
    expect(anchor?.getAttribute(`aria-hidden`)).toBe(`true`)
    expect(container.querySelector(`h2`)?.lastElementChild?.tagName).toBe(`A`)
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

  describe(`edge cases`, () => {
    it.each([
      [`whitespace with id`, `<h2 id="spaces">   </h2>`, undefined, `#spaces`],
      [
        `deeply nested with custom selector`,
        `<div><section><h2 id="deep">X</h2></section></div>`,
        `h2`,
        `#deep`,
      ],
    ])(`%s → href %s`, (_desc, html, selector, expected_href) => {
      const container = create_container(html)
      heading_anchors({ selector })(container)
      expect(container.querySelector(anchor_selector)?.getAttribute(`href`)).toBe(
        expected_href,
      )
    })
  })
})
