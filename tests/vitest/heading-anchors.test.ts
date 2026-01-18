import { heading_anchors, heading_ids } from '$lib/heading-anchors'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe(`heading_ids preprocessor`, () => {
  const preprocess = (content: string) => heading_ids().markup({ content })

  describe(`basic ID generation`, () => {
    it.each([
      [`<h2>Hello World</h2>`, `<h2 id="hello-world">Hello World</h2>`],
      [`<h3>Test Heading</h3>`, `<h3 id="test-heading">Test Heading</h3>`],
      [`<h4>Another One</h4>`, `<h4 id="another-one">Another One</h4>`],
      [`<h5>Fifth Level</h5>`, `<h5 id="fifth-level">Fifth Level</h5>`],
      [`<h6>Sixth Level</h6>`, `<h6 id="sixth-level">Sixth Level</h6>`],
      [`<h1>Title</h1>`, `<h1>Title</h1>`], // h1 unchanged
      [`<h2>Hello! World? Yes.</h2>`, `<h2 id="hello-world-yes">Hello! World? Yes.</h2>`],
      [`<h2>✨ Styling</h2>`, `<h2 id="styling">✨ Styling</h2>`], // emoji stripped
      [`<h2>🔣 Props</h2>`, `<h2 id="props">🔣 Props</h2>`],
      [
        `<h2>Multi\nLine\nContent</h2>`,
        `<h2 id="multi-line-content">Multi\nLine\nContent</h2>`,
      ],
    ])(`%s → %s`, (input, expected) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  describe(`skip existing IDs`, () => {
    it.each([
      [`<h2 id="custom">Hello</h2>`],
      [`<h3 id="my-id">Test</h3>`],
      [`<h2 id="">Empty ID</h2>`],
      [`<h2  id="with-space" >Test</h2>`],
      [`<h2 class="test" id="existing" data-foo="bar">Text</h2>`],
    ])(`preserves: %s`, (input) => {
      expect(preprocess(input).code).toBe(input)
    })
  })

  describe(`preserves/adds attributes correctly`, () => {
    it.each([
      [`<h2 data-id="foo">Hello</h2>`, `<h2 id="hello" data-id="foo">Hello</h2>`],
      [`<h2 aria-id="bar">World</h2>`, `<h2 id="world" aria-id="bar">World</h2>`],
      [`<h2 class="fancy">Title</h2>`, `<h2 id="title" class="fancy">Title</h2>`],
      [
        `<h2 class="test" data-test="foo">Title</h2>`,
        `<h2 id="title" class="test" data-test="foo">Title</h2>`,
      ],
      [
        `<h2 on:click={handler}>Clickable</h2>`,
        `<h2 id="clickable" on:click={handler}>Clickable</h2>`,
      ],
    ])(`%s → %s`, (input, expected) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  it(`handles duplicate headings with -1, -2 suffixes`, () => {
    const result = preprocess(
      `<h2>Foo</h2>\n<h2>Foo</h2>\n<h3>Foo</h3>\n<h2>Bar</h2>\n<h2>Foo</h2>`,
    )
    expect(result.code).toContain(`id="foo"`)
    expect(result.code).toContain(`id="foo-1"`)
    expect(result.code).toContain(`id="foo-2"`)
    expect(result.code).toContain(`id="foo-3"`)
    expect(result.code).toContain(`id="bar"`)
  })

  describe(`strip Svelte expressions`, () => {
    it.each([
      [`<h2>Hello {name}</h2>`, `<h2 id="hello">Hello {name}</h2>`],
      [`<h2>{greeting} World</h2>`, `<h2 id="world">{greeting} World</h2>`],
      [`<h2>{first} and {second}</h2>`, `<h2 id="and">{first} and {second}</h2>`],
      [`<h2>Value: {format({x: 1})}</h2>`, `<h2 id="value">Value: {format({x: 1})}</h2>`],
      [
        `<h2>Result {fn({a: {b: {c: 1}}})}</h2>`,
        `<h2 id="result">Result {fn({a: {b: {c: 1}}})}</h2>`,
      ],
      // unmatched } should be treated as literal text
      [`<h2>Price: $100}</h2>`, `<h2 id="price-100">Price: $100}</h2>`],
      [`<h2>}{test}</h2>`, `<h2>}{test}</h2>`], // } preserved but slugifies to empty
      [`<h2>a } b</h2>`, `<h2 id="a-b">a } b</h2>`],
    ])(`%s → %s`, (input, expected) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  describe(`skip empty/dynamic-only headings`, () => {
    it.each([
      [`<h2>{dynamicOnly}</h2>`],
      [`<h2>   </h2>`],
      [`<h2></h2>`],
      [`<h2><span></span></h2>`],
    ])(`unchanged: %s`, (input) => {
      expect(preprocess(input).code).toBe(input)
    })
  })

  describe(`inline headings (mdsvex output)`, () => {
    it.each([
      [`</p> <h2>Title</h2>`, `</p> <h2 id="title">Title</h2>`],
      [`</div><h3>Inline</h3>`, `</div><h3 id="inline">Inline</h3>`],
      [
        `</p><h2>First</h2></section><h3>Second</h3>`,
        `</p><h2 id="first">First</h2></section><h3 id="second">Second</h3>`,
      ],
    ])(`%s → %s`, (input, expected) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  describe(`headings with HTML tags inside`, () => {
    it.each([
      [
        `<h2><span>Nested</span> Text</h2>`,
        `<h2 id="nested-text"><span>Nested</span> Text</h2>`,
      ],
      [
        `<h2><a href="#">Link Text</a></h2>`,
        `<h2 id="link-text"><a href="#">Link Text</a></h2>`,
      ],
      [
        `<h2>Using <code>someFunction</code></h2>`,
        `<h2 id="using-somefunction">Using <code>someFunction</code></h2>`,
      ],
    ])(`%s → %s`, (input, expected) => {
      expect(preprocess(input).code).toBe(expected)
    })
  })

  it(`returns preprocessor with correct name`, () => {
    const preprocessor = heading_ids()
    expect(preprocessor.name).toBe(`heading-ids`)
    expect(typeof preprocessor.markup({ content: `` }).code).toBe(`string`)
  })
})

describe(`heading_anchors attachment`, () => {
  const create_container = (html = ``) => {
    const container = document.createElement(`div`)
    container.innerHTML = html
    document.body.appendChild(container)
    return container
  }
  const anchor_selector = `a[aria-hidden="true"]`
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

  beforeEach(() => {
    document.body.innerHTML = ``
  })

  describe(`adds anchors to headings`, () => {
    it.each([`h2`, `h3`, `h4`, `h5`, `h6`])(`adds anchor to %s`, (tag) => {
      const container = create_container(`<${tag} id="test">Content</${tag}>`)
      heading_anchors()(container)
      const anchor = container.querySelector(`${tag} ${anchor_selector}`)
      expect(anchor).toBeTruthy()
      expect(anchor?.getAttribute(`href`)).toBe(`#test`)
    })

    it(`handles multiple headings and prevents duplicates`, () => {
      const container = create_container(
        `<h2 id="one">One</h2><h3 id="two">Two</h3><h4 id="three">Three</h4>`,
      )
      heading_anchors()(container)
      heading_anchors()(container) // call twice to test duplicate prevention
      expect(container.querySelectorAll(anchor_selector).length).toBe(3)
    })
  })

  describe(`generates IDs for headings without them`, () => {
    it.each([
      [`<h2>Generated ID</h2>`, `generated-id`],
      [`<h2>Hello! World?</h2>`, `hello-world`],
      [`<h2>Same</h2><h3>Same</h3>`, `same`, `same-1`], // tests unique ID generation
    ])(`%s → id includes "%s"`, (html, ...expected_ids) => {
      const container = create_container(html)
      heading_anchors()(container)
      const ids = Array.from(container.querySelectorAll(`h2, h3`)).map((el) => el.id)
      for (const id of expected_ids) expect(ids).toContain(id)
    })

    it(`skips headings with no usable text`, () => {
      const container = create_container(`<h2></h2>`)
      heading_anchors()(container)
      expect(container.querySelector(`h2 a`)).toBeFalsy()
    })
  })

  describe(`MutationObserver for dynamic content`, () => {
    it.each([
      [`direct`, (c: Element) => {
        const h = document.createElement(`h2`)
        h.id = `dyn`
        c.appendChild(h)
      }],
      [`nested`, (c: Element) => {
        const d = document.createElement(`div`)
        d.innerHTML = `<h3 id="nest">X</h3>`
        c.appendChild(d)
      }],
    ])(`adds anchors to %s dynamically inserted headings`, async (_desc, insert_fn) => {
      const container = create_container()
      heading_anchors()(container)
      insert_fn(container)
      await tick()
      expect(container.querySelector(anchor_selector)).toBeTruthy()
    })
  })

  describe(`cleanup function`, () => {
    it(`disconnects observer and stops processing`, async () => {
      const spy = vi.spyOn(MutationObserver.prototype, `disconnect`)
      const container = create_container()
      const cleanup = heading_anchors()(container)
      expect(cleanup).toBeTypeOf(`function`)
      cleanup?.()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()

      // verify no anchors added after cleanup
      const heading = document.createElement(`h2`)
      heading.id = `after`
      container.appendChild(heading)
      await tick()
      expect(heading.querySelector(anchor_selector)).toBeFalsy()
    })
  })

  describe(`options`, () => {
    it(`selector option filters headings`, () => {
      const container = create_container(
        `<h2 id="h2">H2</h2><h3 id="h3">H3</h3><h4 id="h4">H4</h4>`,
      )
      heading_anchors({ selector: `h2, h3` })(container)
      expect(container.querySelector(`h2 ${anchor_selector}`)).toBeTruthy()
      expect(container.querySelector(`h3 ${anchor_selector}`)).toBeTruthy()
      expect(container.querySelector(`h4 ${anchor_selector}`)).toBeFalsy()
    })

    it(`selector with class works`, () => {
      const container = create_container(
        `<h2 id="plain">Plain</h2><h2 id="anchored" class="anchored">Anchored</h2>`,
      )
      heading_anchors({ selector: `h2.anchored` })(container)
      expect(container.querySelector(`#plain a`)).toBeFalsy()
      expect(container.querySelector(`#anchored a`)).toBeTruthy()
    })

    it(`icon_svg option customizes icon`, () => {
      const container = create_container(`<h2 id="test">Test</h2>`)
      heading_anchors({ icon_svg: `<svg class="custom"></svg>` })(container)
      expect(container.querySelector(`h2 ${anchor_selector} .custom`)).toBeTruthy()
    })

    it(`default icon has aria-label`, () => {
      const container = create_container(`<h2 id="test">Test</h2>`)
      heading_anchors()(container)
      expect(container.querySelector(`h2 ${anchor_selector}`)?.innerHTML).toContain(
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
    const original = globalThis.document
    Object.defineProperty(globalThis, `document`, {
      value: undefined,
      configurable: true,
    })
    try {
      expect(heading_anchors()({} as Element)).toBeUndefined()
    } finally {
      Object.defineProperty(globalThis, `document`, {
        value: original,
        configurable: true,
      })
    }
  })

  describe(`edge cases`, () => {
    it.each([
      [`whitespace with id`, `<h2 id="spaces">   </h2>`, `#spaces`],
      [
        `deeply nested`,
        `<div><section><article><h2 id="deep">Deep</h2></article></section></div>`,
        `#deep`,
      ],
    ])(`%s`, (_desc, html, expected_href) => {
      const container = create_container(html)
      heading_anchors()(container)
      expect(container.querySelector(anchor_selector)?.getAttribute(`href`)).toBe(
        expected_href,
      )
    })

    it(`handles multiple independent containers`, () => {
      const c1 = create_container(`<h2 id="c1">C1</h2>`)
      const c2 = create_container(`<h2 id="c2">C2</h2>`)
      heading_anchors()(c1)
      heading_anchors()(c2)
      expect(c1.querySelector(`#c1 a`)).toBeTruthy()
      expect(c2.querySelector(`#c2 a`)).toBeTruthy()
    })
  })
})
