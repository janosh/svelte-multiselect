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
    ])(`%s → %s`, (input: string, expected: string) => {
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
    ])(`preserves: %s`, (input: string) => {
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
    ])(`%s → %s`, (input: string, expected: string) => {
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
    it.each([
      [`<h2>{dynamicOnly}</h2>`],
      [`<h2>   </h2>`],
      [`<h2></h2>`],
      [`<h2><span></span></h2>`],
    ])(`unchanged: %s`, (input: string) => {
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
    ])(`%s → %s`, (input: string, expected: string) => {
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
    ])(`%s → %s`, (input: string, expected: string) => {
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
  // Default selector uses :scope to target children relative to the attached node
  // In production, the attachment is applied directly to <main> elements
  const create_container = (html = ``, wrapper: `main` | `div` | `none` = `main`) => {
    document.body.innerHTML = wrapper === `none`
      ? html
      : `<${wrapper}>${html}</${wrapper}>`
    // Return the wrapper element (matching production usage of attaching to <main>)
    return wrapper === `none` ? document.body : document.body.firstElementChild as Element
  }
  const anchor_selector = `a[aria-hidden="true"]`
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

  beforeEach(() => {
    document.body.innerHTML = ``
  })

  describe(`adds anchors to headings`, () => {
    // Default selector includes h1-h6 as direct or 2nd-level children of main
    it.each([`h1`, `h2`, `h3`, `h4`, `h5`, `h6`])(`adds anchor to %s`, (tag: string) => {
      const container = create_container(`<${tag} id="test">Content</${tag}>`)
      heading_anchors()(container)
      const anchor = container.querySelector(`${tag} ${anchor_selector}`)
      expect(anchor).toBeTruthy()
      expect(anchor?.getAttribute(`href`)).toBe(`#test`)
    })

    it(`handles multiple headings and prevents duplicates`, () => {
      const container = create_container(
        `<h1 id="title">Title</h1><h2 id="one">One</h2><h3 id="two">Two</h3>`,
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
    ])(`%s → id includes "%s"`, (html: string, ...expected_ids: string[]) => {
      const container = create_container(html)
      heading_anchors()(container)
      const ids = Array.from(container.querySelectorAll(`h1, h2, h3`)).map((el) => el.id)
      for (const id of expected_ids) expect(ids).toContain(id)
    })

    it(`skips headings with no usable text`, () => {
      const container = create_container(`<h2></h2>`)
      heading_anchors()(container)
      expect(container.querySelector(`h2 a`)).toBeFalsy()
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
    ])(
      `%s → matched: %s`,
      (_desc, html, id_sel, should_match) => {
        const container = create_container(html)
        heading_anchors()(container)
        expect(!!document.querySelector(`${id_sel} ${anchor_selector}`)).toBe(
          should_match,
        )
      },
    )
  })

  describe(`MutationObserver for dynamic content`, () => {
    it.each([
      [`direct child`, (container: Element) => {
        const heading = document.createElement(`h2`)
        heading.id = `dyn`
        container.appendChild(heading)
      }],
      [`grandchild (2nd level)`, (container: Element) => {
        const div = document.createElement(`div`)
        div.innerHTML = `<h3 id="nest">X</h3>`
        container.appendChild(div)
      }],
    ])(
      `adds anchors to %s dynamically inserted headings`,
      async (_desc: string, insert_fn: (container: Element) => void) => {
        const container = create_container()
        heading_anchors()(container)
        insert_fn(container)
        await tick()
        expect(document.querySelector(anchor_selector)).toBeTruthy()
      },
    )
  })

  describe(`cleanup function`, () => {
    it(`disconnects observer and stops processing`, async () => {
      const spy = vi.spyOn(MutationObserver.prototype, `disconnect`)
      // Use isolated container with custom selector to avoid interference from other tests
      const container = document.createElement(`div`)
      document.body.appendChild(container)
      const cleanup = heading_anchors({ selector: `h2` })(container)
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
    it.each([
      [
        `filters by tag`,
        `h2, h3`,
        `<h2 id="h2">H2</h2><h4 id="h4">H4</h4>`,
        `h2`,
        true,
        `h4`,
        false,
      ],
      [
        `filters by class`,
        `h2.anchored`,
        `<h2 id="p">P</h2><h2 id="a" class="anchored">A</h2>`,
        `#p`,
        false,
        `#a`,
        true,
      ],
    ])(
      `selector %s`,
      (_desc, selector, html, sel1, match1, sel2, match2) => {
        const container = create_container(html)
        heading_anchors({ selector })(container)
        expect(!!container.querySelector(`${sel1} ${anchor_selector}`)).toBe(match1)
        expect(!!container.querySelector(`${sel2} ${anchor_selector}`)).toBe(match2)
      },
    )

    it(`icon_svg customizes icon, default has aria-label`, () => {
      const container = create_container(`<h2 id="t1">T1</h2><h3 id="t2">T2</h3>`)
      heading_anchors({ selector: `#t1`, icon_svg: `<svg class="custom"></svg>` })(
        container,
      )
      heading_anchors({ selector: `#t2` })(container)
      expect(container.querySelector(`#t1 ${anchor_selector} .custom`)).toBeTruthy()
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

    it(`multiple independent containers`, () => {
      document.body.innerHTML =
        `<div id="c1"><h2 id="h1">C1</h2></div><div id="c2"><h2 id="h2">C2</h2></div>`
      for (const id of [`c1`, `c2`]) {
        const el = document.getElementById(id)
        if (el) heading_anchors({ selector: `h2` })(el)
      }
      expect(document.querySelector(`#h1 a`)).toBeTruthy()
      expect(document.querySelector(`#h2 a`)).toBeTruthy()
    })
  })
})
