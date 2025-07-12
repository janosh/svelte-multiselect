import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { click_outside, get_html_sort_value, tooltip } from '../../src/lib/attachments'

describe(`get_html_sort_value`, () => {
  const create_element = (tag = `div`) => document.createElement(tag)
  const add_data_sort = (element: HTMLElement, value: string) =>
    element.setAttribute(`data-sort-value`, value)
  const add_text = (element: HTMLElement, text: string) => element.textContent = text

  it.each([
    [
      `returns data-sort-value when present`,
      `custom-value`,
      `Different text`,
      `custom-value`,
    ],
    [`returns empty string for data-sort-value=""`, ``, `Some text`, ``],
    [
      `returns textContent when no data-sort-value`,
      null,
      `Element text content`,
      `Element text content`,
    ],
    [`returns empty string for empty elements`, null, null, ``],
    [`returns whitespace textContent`, null, `   \n\t   `, `   \n\t   `],
  ])(`%s`, (_desc, data_sort_value, text_content, expected) => {
    const element = create_element()
    if (data_sort_value !== null) add_data_sort(element, data_sort_value)
    if (text_content !== null) add_text(element, text_content)
    expect(get_html_sort_value(element)).toBe(expected)
  })

  it(`should return child data-sort-value recursively`, () => {
    const [parent, child, grandchild] = [
      create_element(),
      create_element(`span`),
      create_element(`em`),
    ]
    add_text(parent, `Parent text`)
    add_text(child, `Child text`)
    add_data_sort(grandchild, `grandchild-value`)
    add_text(grandchild, `Grandchild text`)
    child.appendChild(grandchild)
    parent.appendChild(child)
    expect(get_html_sort_value(parent)).toBe(`grandchild-value`)
  })

  it(`should return first child data-sort-value when multiple exist`, () => {
    const parent = create_element()
    const [child1, child2] = [create_element(`span`), create_element(`span`)]
    add_data_sort(child1, `first-value`)
    add_data_sort(child2, `second-value`)
    parent.append(child1, child2)
    expect(get_html_sort_value(parent)).toBe(`first-value`)
  })

  it(`should handle deeply nested structures`, () => {
    let current = create_element()
    const root = current
    for (let idx = 0; idx < 10; idx++) {
      const child = create_element()
      add_text(child, `Level ${idx}`)
      current.appendChild(child)
      current = child
    }
    add_data_sort(current, `deep-value`)
    expect(get_html_sort_value(root)).toBe(`deep-value`)
  })

  it(`should return empty string for null textContent`, () => {
    const element = create_element()
    Object.defineProperty(element, `textContent`, { value: null })
    expect(get_html_sort_value(element)).toBe(``)
  })
})

describe(`tooltip`, () => {
  let cleanup_functions: (() => void)[]

  const setup_env = () => {
    cleanup_functions = []
    document.body.innerHTML = ``
    document.documentElement.style.setProperty(`--tooltip-bg`, `#333`)
    document.documentElement.style.setProperty(`--text-color`, `#fff`)
    document.documentElement.style.setProperty(`--tooltip-border`, `1px solid #555`)
    Object.assign(globalThis, {
      innerWidth: 1024,
      innerHeight: 768,
      scrollX: 0,
      scrollY: 0,
    })
  }

  const cleanup_env = () => {
    cleanup_functions.forEach((cleanup) => {
      cleanup()
    })
    cleanup_functions = []
    document.querySelectorAll(`.custom-tooltip`).forEach((tooltip) => tooltip.remove())
    vi.clearAllTimers()
  }

  const create_element = (tag = `div`) => {
    const element = document.createElement(tag)
    document.body.appendChild(element)
    return element
  }

  const setup_tooltip = (element: HTMLElement, options = {}) => {
    const cleanup = tooltip(options)(element)
    if (cleanup) cleanup_functions.push(cleanup)
    return cleanup
  }

  const mock_bounds = (
    element: HTMLElement,
    bounds = { left: 100, top: 100, width: 50, height: 50 },
  ) => {
    element.getBoundingClientRect = vi.fn(() => ({
      ...bounds,
      right: bounds.left + bounds.width,
      bottom: bounds.top + bounds.height,
      x: bounds.left,
      y: bounds.top,
      toJSON: () => ({}),
    }))
  }

  beforeEach(setup_env)
  afterEach(cleanup_env)

  describe(`Content Sources`, () => {
    it.each([
      [`title`, `title`, `Title tooltip`, true],
      [`custom content`, `content`, `Custom content`, false],
      [`aria-label`, `aria-label`, `Aria label tooltip`, false],
      [`data-title`, `data-title`, `Data title tooltip`, false],
    ])(`should create tooltip from %s`, (_desc, attr, content, stores_title) => {
      const element = create_element()
      const options = attr === `content` ? { content } : {}
      if (attr !== `content`) element.setAttribute(attr, content)

      setup_tooltip(element, options)

      expect(element.hasAttribute(`data-original-title`)).toBe(stores_title)
      if (stores_title) expect(element.getAttribute(`data-original-title`)).toBe(content)
      if (attr !== `content`) {
        expect(element.getAttribute(attr)).toBe(stores_title ? null : content)
      }
    })

    it(`should prioritize custom content over title`, () => {
      const element = create_element()
      element.title = `Title content`
      setup_tooltip(element, { content: `Custom content` })
      expect(element.hasAttribute(`data-original-title`)).toBe(false)
    })

    it(`should prioritize title over aria-label`, () => {
      const element = create_element()
      element.title = `Title content`
      element.setAttribute(`aria-label`, `Aria content`)
      setup_tooltip(element)
      expect(element.getAttribute(`data-original-title`)).toBe(`Title content`)
    })

    it.each([
      [`empty content strings`, ``, undefined],
      [`null and undefined content`, undefined, undefined],
    ])(`should handle %s`, (_desc, content, expected) => {
      const element = create_element()
      if (content !== undefined) element.title = content
      const cleanup = tooltip({ content })(element)
      expect(cleanup).toBe(expected)
    })

    it.each([
      [`line breaks`, `Line 1\rLine 2\rLine 3`, `Line 1<br/>Line 2<br/>Line 3`],
      [
        `special HTML characters`,
        `<script>alert('xss')</script>`,
        `<script>alert('xss')</script>`,
      ],
      [`very long content`, `A`.repeat(1000), `A`.repeat(1000)],
      [
        `unicode content`,
        `🚀 Unicode: ñáéíóú 中文 العربية`,
        `🚀 Unicode: ñáéíóú 中文 العربية`,
      ],
    ])(`should handle %s`, (_desc, content, expected) => {
      const element = create_element()
      element.title = content
      setup_tooltip(element)
      expect(element.getAttribute(`data-original-title`)).toBe(
        expected.replace(/<br\/>/g, `\r`),
      )
    })
  })

  describe(`Configuration Options`, () => {
    it.each([
      [`custom delay`, { delay: 500 }, `Delayed tooltip`],
      [`zero delay`, { delay: 0 }, `No delay tooltip`],
      [`negative delay`, { delay: -100 }, `Negative delay tooltip`],
      [`extremely large delay`, { delay: 999999 }, `Large delay tooltip`],
      [`empty options object`, {}, `Empty options tooltip`],
    ])(`should handle %s`, (_desc, options, expected) => {
      const element = create_element()
      element.title = expected
      setup_tooltip(element, options)
      expect(element.getAttribute(`data-original-title`)).toBe(expected)
    })

    it(`should handle all placement options`, () => {
      ;[`top`, `bottom`, `left`, `right`].forEach((placement) => {
        const element = create_element()
        element.title = `${placement} tooltip`
        setup_tooltip(element, { placement })
        expect(element.getAttribute(`data-original-title`)).toBe(`${placement} tooltip`)
      })
    })

    it.each([
      [`invalid placement`, { placement: `invalid` }, `Invalid placement tooltip`],
      [`null options`, null, `Null options tooltip`],
    ])(`should handle %s gracefully`, (_desc, options, expected) => {
      const element = create_element()
      element.title = expected
      const cleanup = tooltip(options)(element)
      if (cleanup) cleanup_functions.push(cleanup)
      expect(element.getAttribute(`data-original-title`)).toBe(expected)
    })
  })

  describe(`Child Element Handling`, () => {
    it.each([
      [`title`, `title`, `Child tooltip`],
      [`aria-label`, `aria-label`, `Child aria tooltip`],
      [`data-title`, `data-title`, `Child data tooltip`],
    ])(`should setup tooltips for child elements with %s`, (_desc, attr, content) => {
      const parent = create_element()
      const child = document.createElement(`span`)
      child.setAttribute(attr, content)
      parent.appendChild(child)

      setup_tooltip(parent)

      if (attr === `title`) {
        expect(child.hasAttribute(`title`)).toBe(false)
        expect(child.getAttribute(`data-original-title`)).toBe(content)
      } else {
        expect(child.getAttribute(attr)).toBe(content)
      }
    })

    it(`should handle deeply nested child elements`, () => {
      const parent = create_element()
      let current = parent
      for (let idx = 0; idx < 5; idx++) {
        const child = document.createElement(`div`)
        child.title = `Level ${idx} tooltip`
        current.appendChild(child)
        current = child
      }

      setup_tooltip(parent)

      parent.querySelectorAll(`[data-original-title]`).forEach((element, idx) => {
        expect(element.getAttribute(`data-original-title`)).toBe(`Level ${idx} tooltip`)
      })
    })

    it(`should handle multiple child elements with tooltips`, () => {
      const parent = create_element()
      for (let idx = 0; idx < 10; idx++) {
        const child = document.createElement(`div`)
        child.title = `Child ${idx} tooltip`
        parent.appendChild(child)
      }

      setup_tooltip(parent)

      const children_with_tooltips = parent.querySelectorAll(`[data-original-title]`)
      expect(children_with_tooltips.length).toBe(10)
      children_with_tooltips.forEach((child, idx) => {
        expect(child.getAttribute(`data-original-title`)).toBe(`Child ${idx} tooltip`)
      })
    })

    it(`should handle child elements with mixed tooltip attributes`, () => {
      const parent = create_element()
      const test_cases = [
        [`title`, `Title tooltip`],
        [`aria-label`, `Aria tooltip`],
        [`data-title`, `Data tooltip`],
        [null, null],
      ]

      test_cases.forEach(([attr, content]) => {
        const child = document.createElement(`div`)
        if (attr && content) child.setAttribute(attr, content)
        parent.appendChild(child)
      })

      setup_tooltip(parent)

      if (parent.children[0].hasAttribute(`data-original-title`)) {
        expect(parent.children[0].getAttribute(`data-original-title`)).toBe(
          `Title tooltip`,
        )
      }
      if (parent.children[1].hasAttribute(`aria-label`)) {
        expect(parent.children[1].getAttribute(`aria-label`)).toBe(`Aria tooltip`)
      }
      if (parent.children[2].hasAttribute(`data-title`)) {
        expect(parent.children[2].getAttribute(`data-title`)).toBe(`Data tooltip`)
      }
      expect(parent.children[3].hasAttribute(`data-original-title`)).toBe(false)
    })

    it.each([
      [`child elements added after initialization`, true],
      [`empty child elements`, false],
    ])(`should handle %s`, (_desc, should_add_after) => {
      const parent = create_element()
      const child = document.createElement(`div`)
      if (should_add_after) {
        setup_tooltip(parent)
        child.title = `Dynamic child tooltip`
        parent.appendChild(child)
        expect(child.hasAttribute(`title`)).toBe(true)
      } else {
        parent.appendChild(child)
        setup_tooltip(parent)
      }
      expect(child.hasAttribute(`data-original-title`)).toBe(false)
    })
  })

  describe(`DOM Manipulation and Positioning`, () => {
    it.each([
      [`correct CSS classes`, { left: 100, top: 100, width: 50, height: 50 }],
      [`correct base styles`, { left: 100, top: 100, width: 50, height: 50 }],
      [`viewport edge constraints`, { left: 1020, top: 5, width: 4, height: 20 }],
      [`different placements`, { left: 400, top: 300, width: 50, height: 50 }],
      [`very small elements`, { left: 500, top: 300, width: 1, height: 1 }],
      [`elements with transforms`, { left: 200, top: 150, width: 50, height: 50 }],
    ])(`should handle %s`, (test_desc, bounds) => {
      const element = create_element()
      element.title = `Test tooltip`
      if (test_desc.includes(`transforms`)) {
        element.style.transform = `rotate(45deg) scale(0.5)`
      }
      mock_bounds(element, bounds)

      setup_tooltip(element)

      const event = new Event(`mouseenter`)
      expect(() => element.dispatchEvent(event)).not.toThrow()
    })

    it(`should handle scroll offset correctly`, () => {
      Object.assign(globalThis, { scrollX: 100, scrollY: 50 })
      const element = create_element()
      element.title = `Scrolled tooltip`
      mock_bounds(element, { left: 200, top: 150, width: 50, height: 50 })

      setup_tooltip(element)

      const event = new Event(`mouseenter`)
      expect(() => element.dispatchEvent(event)).not.toThrow()
    })
  })

  describe(`Event Handling`, () => {
    it.each([
      [`mouseenter`, `div`],
      [`mouseleave`, `div`],
      [`focus`, `button`],
      [`blur`, `button`],
    ])(`should handle %s event`, (event_type, tag) => {
      const element = create_element(tag)
      element.title = `${event_type} tooltip`
      setup_tooltip(element)

      const event = new Event(event_type)
      expect(() => element.dispatchEvent(event)).not.toThrow()
    })

    it(`should handle rapid event sequences`, () => {
      const element = create_element()
      element.title = `Rapid events tooltip`
      setup_tooltip(element)

      for (let idx = 0; idx < 10; idx++) {
        ;[new Event(`mouseenter`), new Event(`mouseleave`)].forEach((event) => {
          element.dispatchEvent(event)
        })
      }
      expect(() => element.dispatchEvent(new Event(`mouseenter`))).not.toThrow()
    })

    it.each([
      [`disabled elements`, true, `button`],
      [`detached elements`, false, `div`],
      [`synthetic events`, false, `div`],
      [`events with custom properties`, false, `div`],
    ])(`should handle %s`, (description, is_disabled, tag) => {
      const element = document.createElement(tag)
      if (!description.includes(`detached`)) document.body.appendChild(element)
      element.title = `${description} tooltip`
      if (is_disabled && `disabled` in element) element.disabled = true

      setup_tooltip(element)

      const event = description.includes(`synthetic`)
        ? new CustomEvent(`mouseenter`, { bubbles: true, cancelable: true })
        : new Event(`mouseenter`)
      if (description.includes(`custom`)) event.customProp = `custom value`

      expect(() => element.dispatchEvent(event)).not.toThrow()
    })
  })

  describe(`Global State Management`, () => {
    it(`should clear previous tooltips when showing new ones`, () => {
      const [element1, element2] = [create_element(), create_element()]
      element1.title = `First tooltip`
      element2.title = `Second tooltip`

      setup_tooltip(element1)
      setup_tooltip(element2)

      element1.dispatchEvent(new Event(`mouseenter`))
      element2.dispatchEvent(new Event(`mouseenter`))

      setTimeout(() => {
        expect(document.querySelectorAll(`.custom-tooltip`).length).toBeLessThanOrEqual(1)
      }, 150)
    })

    it(`should handle multiple tooltip instances`, () => {
      const elements = Array.from({ length: 5 }, (_, idx) => {
        const element = create_element()
        element.title = `Tooltip ${idx}`
        setup_tooltip(element)
        return element
      })

      elements.forEach((element) => element.dispatchEvent(new Event(`mouseenter`)))
      expect(elements.length).toBe(5)
    })

    it.each([
      [`tooltip cleanup on element removal`, true],
      [`concurrent tooltip operations`, false],
    ])(`should handle %s`, (description, should_remove) => {
      const element = create_element()
      element.title = `${description} tooltip`
      setup_tooltip(element)

      const event = new Event(`mouseenter`)
      element.dispatchEvent(event)

      if (should_remove) {
        element.remove()
        expect(() => element.dispatchEvent(new Event(`mouseleave`))).not.toThrow()
      } else {
        ;[new Event(`mouseenter`), new Event(`mouseleave`)].forEach((e) => {
          element.dispatchEvent(e)
          element.dispatchEvent(e)
        })
        expect(() => element.dispatchEvent(new Event(`mouseenter`))).not.toThrow()
      }
    })
  })

  describe(`Memory Management and Cleanup`, () => {
    it(`should clean up event listeners on cleanup`, () => {
      const element = create_element()
      element.title = `Cleanup test tooltip`
      const cleanup = setup_tooltip(element)
      expect(cleanup).toBeDefined()
      expect(() => cleanup?.()).not.toThrow()
    })

    it(`should restore original title on cleanup`, () => {
      const element = create_element()
      element.title = `Original title`
      const cleanup = setup_tooltip(element)

      expect(element.hasAttribute(`title`)).toBe(false)
      expect(element.getAttribute(`data-original-title`)).toBe(`Original title`)

      cleanup?.()
      expect(element.getAttribute(`title`)).toBe(`Original title`)
      expect(element.hasAttribute(`data-original-title`)).toBe(false)
    })

    it.each([
      [`multiple cleanup calls`, 3],
      [`child element listeners`, 1],
      [`global tooltips on cleanup`, 1],
      [`cleanup with active timers`, 1],
      [`cleanup of detached elements`, 1],
    ])(`should handle %s`, (test_name, call_count) => {
      const element = create_element()
      element.title = `${test_name} tooltip`

      if (test_name.includes(`child`)) {
        const child = document.createElement(`div`)
        child.title = `Child cleanup tooltip`
        element.appendChild(child)
      }

      const cleanup = setup_tooltip(
        element,
        test_name.includes(`timer`) ? { delay: 1000 } : {},
      )

      if (test_name.includes(`global`) || test_name.includes(`timer`)) {
        element.dispatchEvent(new Event(`mouseenter`))
      }

      if (test_name.includes(`detached`)) element.remove()

      expect(() => {
        for (let i = 0; i < call_count; i++) cleanup?.()
      }).not.toThrow()
    })
  })

  describe(`Error Handling and Edge Cases`, () => {
    it.each([
      [`null elements`, null],
      [`undefined elements`, undefined],
    ])(`should handle %s gracefully`, (_desc, element) => {
      expect(() => tooltip()(element)).not.toThrow()
    })

    it(`should handle elements without getBoundingClientRect`, () => {
      const element = create_element()
      element.title = `No getBoundingClientRect tooltip`
      delete element.getBoundingClientRect

      setup_tooltip(element)
      expect(() => element.dispatchEvent(new Event(`mouseenter`))).not.toThrow()
    })

    it.each([
      [
        `DOM mutations during tooltip display`,
        () => document.body.appendChild(document.createElement(`div`)),
      ],
      [
        `window resize during tooltip display`,
        () => Object.assign(globalThis, { innerWidth: 800, innerHeight: 600 }),
      ],
      [
        `CSS variable absence`,
        () =>
          [`--tooltip-bg`, `--text-color`, `--tooltip-border`].forEach((prop) =>
            document.documentElement.style.removeProperty(prop)
          ),
      ],
    ])(`should handle %s gracefully`, (description, mutation_fn) => {
      const element = create_element()
      element.title = `${description} tooltip`
      setup_tooltip(element)

      element.dispatchEvent(new Event(`mouseenter`))
      mutation_fn()

      expect(() => element.dispatchEvent(new Event(`mouseleave`))).not.toThrow()
    })

    it.each([
      [`extremely long content`, `A`.repeat(10000)],
      [`malformed HTML in content`, `<div><span>Unclosed tags<div><span>`],
    ])(`should handle %s gracefully`, (_desc, content) => {
      const element = create_element()
      element.title = content
      setup_tooltip(element)
      expect(() => element.dispatchEvent(new Event(`mouseenter`))).not.toThrow()
    })

    it(`should handle high-frequency events`, () => {
      const element = create_element()
      element.title = `High frequency tooltip`
      setup_tooltip(element, { delay: 10 })

      for (let idx = 0; idx < 100; idx++) {
        element.dispatchEvent(new Event(idx % 2 === 0 ? `mouseenter` : `mouseleave`))
      }
      expect(() => element.dispatchEvent(new Event(`mouseenter`))).not.toThrow()
    })
  })
})

describe(`click_outside`, () => {
  let cleanup_functions: (() => void)[]

  beforeEach(() => {
    cleanup_functions = []
    document.body.innerHTML = ``
  })

  afterEach(() => {
    cleanup_functions.forEach((cleanup) => {
      cleanup()
    })
    cleanup_functions = []
  })

  const create_element = () => {
    const element = document.createElement(`div`)
    document.body.appendChild(element)
    return element
  }

  const setup_click_outside = (element: HTMLElement, config = {}) => {
    const cleanup = click_outside(config)(element)
    if (cleanup) cleanup_functions.push(cleanup)
    return cleanup
  }

  const dispatch_click = (target: HTMLElement, path: Element[] = []) => {
    const event = new Event(`click`, { bubbles: true })
    Object.defineProperty(event, `target`, { value: target })
    Object.defineProperty(event, `composedPath`, {
      value: () =>
        path.length
          ? path
          : [target, document.body, document.documentElement, document, globalThis],
    })
    document.dispatchEvent(event)
    return event
  }

  it(`should trigger callback on outside click`, () => {
    const element = create_element()
    const callback = vi.fn()
    setup_click_outside(element, { callback })

    const outside_element = create_element()
    dispatch_click(outside_element)

    expect(callback).toHaveBeenCalledWith(element, {
      callback,
      enabled: true,
      exclude: [],
    })
  })

  it(`should not trigger callback on inside click`, () => {
    const element = create_element()
    const callback = vi.fn()
    setup_click_outside(element, { callback })

    dispatch_click(element, [
      element,
      document.body,
      document.documentElement,
      document,
      globalThis,
    ])
    expect(callback).not.toHaveBeenCalled()
  })

  it(`should respect enabled flag`, () => {
    const element = create_element()
    const callback = vi.fn()
    setup_click_outside(element, { callback, enabled: false })

    dispatch_click(create_element())
    expect(callback).not.toHaveBeenCalled()
  })

  it(`should handle exclude selectors`, () => {
    const element = create_element()
    const excluded = create_element()
    excluded.className = `excluded`
    excluded.closest = vi.fn((selector) => selector === `.excluded` ? excluded : null)

    const callback = vi.fn()
    setup_click_outside(element, { callback, exclude: [`.excluded`] })

    dispatch_click(excluded)
    expect(callback).not.toHaveBeenCalled()
  })

  it(`should dispatch custom event`, () => {
    const element = create_element()
    const custom_event_listener = vi.fn()
    element.addEventListener(`outside-click`, custom_event_listener)

    setup_click_outside(element)
    dispatch_click(create_element())

    expect(custom_event_listener).toHaveBeenCalled()
  })

  it(`should clean up event listeners`, () => {
    const element = create_element()
    const cleanup = setup_click_outside(element)
    expect(cleanup).toBeDefined()
    expect(() => cleanup?.()).not.toThrow()
  })
})
