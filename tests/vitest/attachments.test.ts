import {
  click_outside,
  draggable,
  get_html_sort_value,
  highlight_matches,
  resizable,
  sortable,
  tooltip,
} from '$lib/attachments'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  const create_element = (tag = `div`) => {
    const element = document.createElement(tag)
    document.body.appendChild(element)
    return element
  }

  const setup_tooltip = (element: HTMLElement, options = {}) => {
    const cleanup = tooltip(options)(element)
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

  // Shared helper for triggering tooltip display (requires vi.useFakeTimers())
  const trigger_tooltip = (element: HTMLElement) => {
    element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
    vi.runAllTimers()
  }

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
      [`delay: 500`, { delay: 500 }],
      [`delay: 0`, { delay: 0 }],
      [`delay: -100`, { delay: -100 }],
      [`empty options`, {}],
      [`placement: top`, { placement: `top` }],
      [`placement: bottom`, { placement: `bottom` }],
      [`style string`, { style: `background: red;` }],
      [`empty style`, { style: `` }],
      [`malformed style`, { style: ` bg: red ; invalid; ` }],
    ])(`should setup tooltip with %s`, (_desc, options) => {
      const element = create_element()
      element.title = `test`
      setup_tooltip(element, options)
      expect(element.getAttribute(`data-original-title`)).toBe(`test`)
    })

    it(`should handle disabled option`, () => {
      const element = create_element()
      element.title = `Disabled tooltip`
      const cleanup = setup_tooltip(element, { disabled: true })
      expect(cleanup).toBeUndefined()
      expect(element.hasAttribute(`data-original-title`)).toBe(false)
      expect(element.getAttribute(`title`)).toBe(`Disabled tooltip`)
    })

    it.each([
      [`invalid placement`, { placement: `invalid` }],
      [`null options`, null],
    ])(`should handle %s gracefully`, (_desc, options) => {
      const element = create_element()
      element.title = `test`
      const factory = options === null
        ? tooltip(undefined)
        : tooltip(options as Parameters<typeof tooltip>[0])
      factory(element)
      expect(element.getAttribute(`data-original-title`)).toBe(`test`)
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
      } else expect(child.getAttribute(attr)).toBe(content)
    })

    it(`should handle deeply nested and multiple children`, () => {
      const parent = create_element()
      let current = parent
      for (let idx = 0; idx < 5; idx++) {
        const child = document.createElement(`div`)
        child.title = `Level ${idx}`
        current.appendChild(child)
        current = child
      }
      setup_tooltip(parent)
      expect(parent.querySelectorAll(`[data-original-title]`).length).toBe(5)
    })

    it(`should not setup children added after initialization`, () => {
      const parent = create_element()
      setup_tooltip(parent)
      const child = document.createElement(`div`)
      child.title = `Dynamic`
      parent.appendChild(child)
      expect(child.hasAttribute(`data-original-title`)).toBe(false)
    })
  })

  describe(`Event Handling and Cleanup`, () => {
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

    it(`should remove scroll listener on cleanup`, () => {
      const element = create_element()
      element.title = `test`
      const spy = vi.spyOn(globalThis, `removeEventListener`)
      setup_tooltip(element)?.()
      expect(spy).toHaveBeenCalledWith(`scroll`, expect.any(Function), true)
      spy.mockRestore()
    })
  })

  describe(`Error Handling`, () => {
    it.each([
      [`null element`, null],
      [`undefined element`, undefined],
    ])(`should handle %s gracefully`, (_desc, el) => {
      expect(tooltip()(el as unknown as Element)).toBeUndefined()
    })
  })

  describe(`Reactive Content and Scroll Behavior`, () => {
    // MutationObserver callbacks don't fire in happy-dom, so we test setup/cleanup/ownership.
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it(`tracks tooltip ownership via _owner property`, () => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })
      trigger_tooltip(element)

      const tooltip_el = document.querySelector(`.custom-tooltip`) as HTMLElement & {
        _owner?: HTMLElement
      }
      expect(tooltip_el?._owner).toBe(element)
    })

    it.each([
      [`unrelated element keeps tooltip`, () => document.createElement(`div`), true],
      [`document hides tooltip`, () => document, false],
      [`documentElement hides tooltip`, () => document.documentElement, false],
      [`body hides tooltip`, () => document.body, false],
    ])(`scroll from %s`, (_desc, get_target, should_persist) => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })
      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeTruthy()

      const scroll_event = new Event(`scroll`, { bubbles: true })
      Object.defineProperty(scroll_event, `target`, { value: get_target() })
      globalThis.dispatchEvent(scroll_event)
      expect(!!document.querySelector(`.custom-tooltip`)).toBe(should_persist)
    })

    it(`scroll from ancestor hides tooltip`, () => {
      const ancestor = document.createElement(`div`)
      const element = create_element()
      ancestor.appendChild(element)
      document.body.appendChild(ancestor)
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })
      trigger_tooltip(element)

      const scroll_event = new Event(`scroll`, { bubbles: true })
      Object.defineProperty(scroll_event, `target`, { value: ancestor })
      globalThis.dispatchEvent(scroll_event)

      expect(document.querySelector(`.custom-tooltip`)).toBeFalsy()
      ancestor.remove()
    })

    it(`shows only one tooltip at a time`, () => {
      const [el1, el2] = [create_element(), create_element()]
      el1.title = `tooltip1`
      el2.title = `tooltip2`
      mock_bounds(el1)
      mock_bounds(el2)
      setup_tooltip(el1, { delay: 0 })
      setup_tooltip(el2, { delay: 0 })

      trigger_tooltip(el1)
      trigger_tooltip(el2)

      expect(document.querySelectorAll(`.custom-tooltip`).length).toBe(1)
      expect(document.querySelector(`.custom-tooltip`)?.textContent).toContain(`tooltip2`)
    })

    it(`shows/hides on focus/blur for accessibility`, () => {
      const element = create_element(`button`)
      element.title = `focus tooltip`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })

      element.dispatchEvent(new FocusEvent(`focus`, { bubbles: true }))
      vi.runAllTimers()
      expect(document.querySelector(`.custom-tooltip`)).toBeTruthy()

      element.dispatchEvent(new FocusEvent(`blur`, { bubbles: true }))
      expect(document.querySelector(`.custom-tooltip`)).toBeFalsy()
    })
  })

  describe(`New Features`, () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it.each([
      [`hide_delay: 200 delays hiding`, { hide_delay: 200 }, true, 200],
      [`hide_delay: 0 hides immediately`, { hide_delay: 0 }, false, 0],
      [`undefined hide_delay hides immediately`, {}, false, 0],
    ])(`%s`, (_desc, options, visible_after_leave, delay_ms) => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, ...options })

      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeTruthy()

      element.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
      expect(!!document.querySelector(`.custom-tooltip`)).toBe(visible_after_leave)

      if (delay_ms > 0) {
        vi.advanceTimersByTime(delay_ms)
        expect(document.querySelector(`.custom-tooltip`)).toBeFalsy()
      }
    })

    it(`disabled: 'touch-devices' skips tooltip on touch input`, () => {
      // With runtime detection, tooltip is set up but skipped when last pointer was touch
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      const cleanup = setup_tooltip(element, { delay: 0, disabled: `touch-devices` })

      // Tooltip is set up (cleanup returned) but behavior depends on pointer type
      expect(cleanup).toBeDefined()

      // Simulate touch input, then try to show tooltip
      document.dispatchEvent(
        new PointerEvent(`pointerdown`, { pointerType: `touch`, bubbles: true }),
      )
      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeFalsy() // No tooltip on touch

      // Simulate mouse input, then show tooltip
      document.dispatchEvent(
        new PointerEvent(`pointerdown`, { pointerType: `mouse`, bubbles: true }),
      )
      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeTruthy() // Tooltip works with mouse

      cleanup?.()
    })

    it.each([
      [`Escape dismisses tooltip`, `Escape`, false],
      [`Enter does not dismiss`, `Enter`, true],
    ])(`%s`, (_desc, key, should_remain) => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })

      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeTruthy()

      document.dispatchEvent(new KeyboardEvent(`keydown`, { key }))
      expect(!!document.querySelector(`.custom-tooltip`)).toBe(should_remain)
    })

    it.each([
      [`show_arrow: false hides arrow`, { show_arrow: false }, false],
      [`show_arrow: true (default) shows arrow`, {}, true],
    ])(`%s`, (_desc, options, expect_arrow) => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, ...options })

      trigger_tooltip(element)

      const tooltip_el = document.querySelector(`.custom-tooltip`)
      expect(tooltip_el).toBeTruthy()
      expect(!!tooltip_el?.querySelector(`.custom-tooltip-arrow`)).toBe(expect_arrow)
    })

    it(`manages aria-describedby on show/hide`, () => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })

      expect(element.hasAttribute(`aria-describedby`)).toBe(false)

      trigger_tooltip(element)
      const tooltip_el = document.querySelector(`.custom-tooltip`)
      expect(tooltip_el?.getAttribute(`role`)).toBe(`tooltip`)
      expect(tooltip_el?.id).toMatch(/^tooltip-/)
      expect(element.getAttribute(`aria-describedby`)).toBe(tooltip_el?.id)

      element.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
      expect(element.hasAttribute(`aria-describedby`)).toBe(false)
    })

    it.each([
      [`offset: 20`, 20, 170], // top (100) + height (50) + offset (20) = 170
      [`offset: 5`, 5, 155], // top (100) + height (50) + offset (5) = 155
      [`default offset: 12`, undefined, 162], // top (100) + height (50) + default (12) = 162
    ])(`applies %s`, (_desc, offset, expected_top) => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element, { left: 100, top: 100, width: 50, height: 50 })
      setup_tooltip(element, { delay: 0, offset, placement: `bottom` })

      trigger_tooltip(element)
      const tooltip_el = document.querySelector(`.custom-tooltip`) as HTMLElement
      expect(tooltip_el).toBeTruthy()
      // Verify top position includes offset (bottom placement: element.top + element.height + offset)
      expect(tooltip_el.style.top).toBe(`${expected_top}px`)
    })

    it.each([
      [`allow_html: false uses textContent`, false, `<b>bold</b>`, `<b>bold</b>`],
      [`allow_html: true uses innerHTML`, true, `<b>bold</b>`, `bold`],
      [
        `allow_html: undefined (default) uses innerHTML`,
        undefined,
        `<b>bold</b>`,
        `bold`,
      ],
    ])(`%s`, (_desc, allow_html, content, expected_text) => {
      const element = create_element()
      element.title = content
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, allow_html })

      trigger_tooltip(element)
      const tooltip_el = document.querySelector(`.custom-tooltip`) as HTMLElement
      expect(tooltip_el).toBeTruthy()
      expect(tooltip_el.textContent).toBe(expected_text)
    })

    it.each([
      [`called and strips XSS`, true, `<script>xss</script>Safe`, 1, `Safe`],
      [`skipped when allow_html: false`, false, `Plain`, 0, `Plain`],
    ])(`sanitize_html %s`, (_desc, allow_html, title, call_count, expected_text) => {
      const sanitizer = vi.fn((html: string) =>
        html.replace(/<script[^>]*>.*?<\/script>/gi, ``)
      )
      const element = create_element()
      element.title = title
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, allow_html, sanitize_html: sanitizer })

      trigger_tooltip(element)
      expect(sanitizer).toHaveBeenCalledTimes(call_count)
      const tooltip_el = document.querySelector(`.custom-tooltip`) as HTMLElement
      expect(tooltip_el.textContent).toBe(expected_text)
    })

    it(`tooltip structure: .tooltip-content span and display: inline-block`, () => {
      const element = create_element()
      element.title = `Test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })

      trigger_tooltip(element)
      const tooltip_el = document.querySelector(`.custom-tooltip`) as HTMLElement
      expect(tooltip_el.style.display).toBe(`inline-block`)
      const content_span = tooltip_el.querySelector(`.tooltip-content`)
      expect(content_span?.tagName).toBe(`SPAN`)
      expect(content_span?.textContent).toBe(`Test`)
    })
  })
})

describe(`click_outside`, () => {
  const create_element = () => {
    const element = document.createElement(`div`)
    document.body.appendChild(element)
    return element
  }

  const dispatch_click = (target: HTMLElement, path: EventTarget[] = []) => {
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

  it.each([
    [`outside click`, true, true, 1],
    [`inside click`, false, true, 0],
    [`disabled`, true, false, 0],
  ])(`%s triggers callback %s times`, (_desc, is_outside, enabled, expected_calls) => {
    const element = create_element()
    const callback = vi.fn()
    click_outside({ callback, enabled })(element)

    const target = is_outside ? create_element() : element
    const path = is_outside
      ? []
      : [element, document.body, document.documentElement, document, globalThis]
    dispatch_click(target, path)

    expect(callback).toHaveBeenCalledTimes(expected_calls)
  })

  it(`should handle exclude selectors (single, multiple, nested)`, () => {
    const element = create_element()
    const [excluded1, excluded2, nested] = [
      create_element(),
      create_element(),
      create_element(),
    ]
    excluded1.className = `modal`
    excluded2.className = `popover`
    excluded1.appendChild(nested)
    excluded1.closest = vi.fn((sel) => sel === `.modal` ? excluded1 : null)
    excluded2.closest = vi.fn((sel) => sel === `.popover` ? excluded2 : null)
    nested.closest = vi.fn((sel) => sel === `.modal` ? excluded1 : null)

    const callback = vi.fn()
    click_outside({ callback, exclude: [`.modal`, `.popover`] })(element)

    dispatch_click(excluded1)
    dispatch_click(excluded2)
    dispatch_click(nested)
    expect(callback).not.toHaveBeenCalled()
  })

  it(`should dispatch custom event (with or without callback)`, () => {
    const element = create_element()
    const listener = vi.fn()
    element.addEventListener(`outside-click`, listener)
    click_outside({})(element) // no callback
    dispatch_click(create_element())
    expect(listener).toHaveBeenCalled()
  })

  it(`should clean up without throwing`, () => {
    const cleanup = click_outside({})(create_element())
    expect(() => cleanup?.()).not.toThrow()
  })
})

describe(`draggable`, () => {
  const create_element = () => {
    const element = document.createElement(`div`)
    document.body.appendChild(element)
    return element
  }

  const mock_rect = (
    element: HTMLElement,
    rect: { left: number; top: number; width?: number; height?: number },
  ) => {
    element.getBoundingClientRect = vi.fn(() => ({
      left: rect.left,
      top: rect.top,
      width: rect.width ?? 100,
      height: rect.height ?? 50,
      right: rect.left + (rect.width ?? 100),
      bottom: rect.top + (rect.height ?? 50),
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }))
  }

  it(`should not set width on mousedown and should set left/top`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 40, top: 60, width: 123, height: 45 })

    const attach = draggable()
    const cleanup = attach(element)
    expect(typeof cleanup).toBe(`function`)

    const mousedown = new MouseEvent(`mousedown`, {
      clientX: 100,
      clientY: 100,
      bubbles: true,
    })
    element.dispatchEvent(mousedown)

    expect(element.style.width).toBe(``)
    expect(element.style.left).toBe(`40px`)
    expect(element.style.top).toBe(`60px`)
  })

  it(`should update position while dragging and reset cursor on mouseup`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 10, top: 20 })

    const attach = draggable({ on_drag: vi.fn() })
    const cleanup = attach(element)
    const mousedown = new MouseEvent(`mousedown`, {
      clientX: 5,
      clientY: 5,
      bubbles: true,
    })
    element.dispatchEvent(mousedown)

    const mousemove = new MouseEvent(`mousemove`, {
      clientX: 15,
      clientY: 25,
      bubbles: true,
    })
    globalThis.dispatchEvent(mousemove)
    expect(element.style.left).toBe(`20px`)
    expect(element.style.top).toBe(`40px`)

    const mouseup = new MouseEvent(`mouseup`, { bubbles: true })
    globalThis.dispatchEvent(mouseup)

    cleanup?.()
    expect(() => globalThis.dispatchEvent(new MouseEvent(`mousemove`))).not.toThrow()
  })

  it(`should not set up dragging when disabled`, () => {
    const element = create_element()
    const cleanup = draggable({ disabled: true })(element)
    expect(cleanup).toBeUndefined()
    expect(element.style.cursor).toBe(``)
  })

  it(`should call callbacks, update cursor/userSelect throughout drag lifecycle`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 0, top: 0 })

    const [on_drag_start, on_drag, on_drag_end] = [vi.fn(), vi.fn(), vi.fn()]
    draggable({ on_drag_start, on_drag, on_drag_end })(element)

    expect(element.style.cursor).toBe(`grab`)

    element.dispatchEvent(
      new MouseEvent(`mousedown`, { clientX: 0, clientY: 0, bubbles: true }),
    )
    expect(on_drag_start).toHaveBeenCalledTimes(1)
    expect(element.style.cursor).toBe(`grabbing`)
    expect(document.body.style.userSelect).toBe(`none`)

    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, { clientX: 10, clientY: 10, bubbles: true }),
    )
    expect(on_drag).toHaveBeenCalledTimes(1)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    expect(on_drag_end).toHaveBeenCalledTimes(1)
    expect(element.style.cursor).toBe(`grab`)
    expect(document.body.style.userSelect).toBe(``)
  })

  it(`should cleanup and reset cursor`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 0, top: 0 })

    const cleanup = draggable()(element)
    expect(element.style.cursor).toBe(`grab`)
    cleanup?.()
    expect(element.style.cursor).toBe(``)
  })

  it(`should warn and return undefined for missing handle selector`, () => {
    const element = create_element()
    const warn_spy = vi.spyOn(console, `warn`).mockImplementation(() => {})

    const cleanup = draggable({ handle_selector: `.nonexistent` })(element)

    expect(cleanup).toBeUndefined()
    expect(warn_spy).toHaveBeenCalledWith(expect.stringContaining(`.nonexistent`))
    warn_spy.mockRestore()
  })

  it(`should only drag when event originates from handle_selector`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 0, top: 0 })

    const handle = document.createElement(`div`)
    handle.className = `drag-handle`
    element.appendChild(handle)

    const attach = draggable({ handle_selector: `.drag-handle` })
    attach(element)

    // mousedown on element (not handle) should not start dragging
    element.dispatchEvent(
      new MouseEvent(`mousedown`, { clientX: 0, clientY: 0, bubbles: true }),
    )
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, { clientX: 50, clientY: 50, bubbles: true }),
    )
    expect(element.style.left).toBe(``)
    expect(element.style.top).toBe(``)

    // mousedown on handle should start dragging
    handle.dispatchEvent(
      new MouseEvent(`mousedown`, { clientX: 0, clientY: 0, bubbles: true }),
    )
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, { clientX: 30, clientY: 40, bubbles: true }),
    )
    expect(element.style.left).toBe(`30px`)
    expect(element.style.top).toBe(`40px`)
  })

  it(`should use offsetLeft/offsetTop for non-fixed positioning`, () => {
    const element = create_element()
    element.style.position = `absolute`
    // Mock offsetLeft and offsetTop (these are read-only, so we use Object.defineProperty)
    Object.defineProperty(element, `offsetLeft`, { value: 25, configurable: true })
    Object.defineProperty(element, `offsetTop`, { value: 35, configurable: true })

    const attach = draggable()
    attach(element)

    element.dispatchEvent(
      new MouseEvent(`mousedown`, { clientX: 10, clientY: 10, bubbles: true }),
    )

    expect(element.style.left).toBe(`25px`)
    expect(element.style.top).toBe(`35px`)

    // Drag to new position
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, { clientX: 30, clientY: 50, bubbles: true }),
    )
    expect(element.style.left).toBe(`45px`) // 25 + (30-10)
    expect(element.style.top).toBe(`75px`) // 35 + (50-10)
  })

  it(`should ignore mousemove when not dragging`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 0, top: 0 })
    const on_drag = vi.fn()

    draggable({ on_drag })(element)

    // Dispatch mousemove without mousedown first
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, { clientX: 100, clientY: 100, bubbles: true }),
    )

    expect(on_drag).not.toHaveBeenCalled()
    expect(element.style.left).toBe(``)
  })

  it(`should ignore mouseup when not dragging`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 0, top: 0 })
    const on_drag_end = vi.fn()

    draggable({ on_drag_end })(element)

    // Dispatch mouseup without mousedown first
    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))

    expect(on_drag_end).not.toHaveBeenCalled()
  })
})

describe(`highlight_matches`, () => {
  let mock_element: HTMLElement
  let mock_css_highlights: Map<string, string>

  beforeEach(() => {
    mock_element = document.createElement(`div`)
    mock_css_highlights = new Map()

    const css_mock = {
      highlights: {
        clear: vi.fn(() => mock_css_highlights.clear()),
        set: vi.fn((key: string, value: string) => mock_css_highlights.set(key, value)),
        delete: vi.fn((key: string) => mock_css_highlights.delete(key)),
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

  it.each([
    // Early returns
    [`CSS not supported`, undefined, `test`, `test`, false, 0, undefined],
    [`no query`, true, ``, `test`, false, 0, undefined],
    [`CSS not supported (fuzzy)`, undefined, `auo`, `auo`, true, 0, undefined],
    [`no query (fuzzy)`, true, ``, `auo`, true, 0, undefined],

    // Substring highlighting (fuzzy=false)
    [
      `substring match`,
      true,
      `<p>This is a test paragraph</p>`,
      `test`,
      false,
      1,
      undefined,
    ],
    [
      `multiple matches`,
      true,
      `<div><span>first test</span><span>second test</span></div>`,
      `test`,
      false,
      1,
      undefined,
    ],
    [
      `case insensitive`,
      true,
      `<p>Test with TEST and TeSt</p>`,
      `test`,
      false,
      1,
      undefined,
    ],
    [
      `no matches`,
      true,
      `<p>Content without search term</p>`,
      `xyz`,
      false,
      1,
      undefined,
    ],

    // Fuzzy highlighting (fuzzy=true)
    [`fuzzy match`, true, `<p>allow-user-options</p>`, `auo`, true, 1, undefined],
    [
      `fuzzy case insensitive`,
      true,
      `<p>ALLOW-USER-OPTIONS</p>`,
      `auo`,
      true,
      1,
      undefined,
    ],
    [
      `fuzzy no matches`,
      true,
      `<p>Content without search term</p>`,
      `xyz`,
      true,
      1,
      undefined,
    ],
    [
      `skip with node_filter`,
      true,
      `<div>Test content</div><li class="user-msg">Create this option...</li>`,
      `test`,
      false,
      1,
      (node: Node) =>
        node?.parentElement?.closest(`li.user-msg`)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    ],
    [
      `fuzzy skip with node_filter`,
      true,
      `<div>Test content</div><li class="user-msg">Create this option...</li>`,
      `test`,
      true,
      1,
      (node: Node) =>
        node?.parentElement?.closest(`li.user-msg`)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    ],
  ])(
    `%s`,
    (
      _desc,
      css_supported,
      query,
      html_content,
      fuzzy,
      expected_set_calls,
      node_filter = undefined,
    ) => {
      if (css_supported === undefined) {
        vi.stubGlobal(`CSS`, undefined)
      }

      mock_element.innerHTML = html_content
      const attachment = highlight_matches({ query, fuzzy, node_filter })
      attachment(mock_element)

      expect(mock_css_highlights.size).toBe(
        css_supported === undefined ? 0 : expected_set_calls,
      )

      if (css_supported) {
        expect(globalThis.CSS.highlights.clear).toHaveBeenCalledTimes(
          0,
        )
        if (expected_set_calls > 0) {
          expect(globalThis.CSS.highlights.set).toHaveBeenCalledWith(
            `highlight-match`,
            expect.any(Object),
          )
        }
      }
    },
  )

  it(`should not clear other highlights when highlighting`, () => {
    // Setup existing highlights from other components
    mock_css_highlights.set(`other-highlight`, `existing highlight`)

    // Create our highlight
    mock_element.innerHTML = `<p>test content</p>`
    highlight_matches({ query: `test` })(mock_element)

    // Verify our highlight was added and others preserved
    expect(mock_css_highlights.has(`highlight-match`)).toBe(true)
    expect(mock_css_highlights.has(`other-highlight`)).toBe(true)
    expect(globalThis.CSS.highlights.clear).not.toHaveBeenCalled()
  })
})

describe(`sortable`, () => {
  const create_table = () => {
    const table = document.createElement(`table`)
    const thead = document.createElement(`thead`)
    const tr = document.createElement(`tr`)
    ;[`Planet`, `Moons`].forEach((text) => {
      const th = document.createElement(`th`)
      th.textContent = text
      tr.appendChild(th)
    })
    thead.appendChild(tr)
    table.appendChild(thead)

    const tbody = document.createElement(`tbody`)
    const rows = [
      [`Earth`, `1`],
      [`Jupiter`, `95`],
      [`Mars`, `2`],
    ]
    rows.forEach(([planet, moons]) => {
      const row = document.createElement(`tr`)
      const td1 = document.createElement(`td`)
      const td2 = document.createElement(`td`)
      td1.textContent = planet
      td2.textContent = moons
      row.append(td1, td2)
      tbody.appendChild(row)
    })
    table.appendChild(tbody)
    document.body.appendChild(table)
    return table
  }

  const get_column_values = (table: HTMLTableElement, col_idx: number) =>
    Array.from(table.querySelectorAll(`tbody tr`)).map((row) =>
      row.children[col_idx].textContent
    )

  it(`should sort ascending then descending when clicking the same header`, () => {
    const table = create_table()
    const cleanup = sortable()(table)
    const [planet_header, moons_header] = Array.from(table.querySelectorAll(`thead th`))

    planet_header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(get_column_values(table, 0)).toEqual([`Earth`, `Jupiter`, `Mars`])

    planet_header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(get_column_values(table, 0)).toEqual([`Mars`, `Jupiter`, `Earth`])

    moons_header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(get_column_values(table, 1)).toEqual([`1`, `2`, `95`])

    cleanup?.()
  })

  it(`should not set up sorting when disabled`, () => {
    const table = create_table()
    expect(sortable({ disabled: true })(table)).toBeUndefined()
    expect((table.querySelector(`thead th`) as HTMLElement).style.cursor).toBe(``)
  })

  it(`should add pointer cursor and fully restore on cleanup`, () => {
    const table = create_table()
    const headers = Array.from(table.querySelectorAll(`thead th`))
    const original_texts = headers.map((h) => h.textContent)

    const cleanup = sortable()(table)
    headers.forEach((h) => expect((h as HTMLElement).style.cursor).toBe(`pointer`))

    headers[0].dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(headers[0].textContent).toContain(`↑`)
    expect(headers[0].classList.contains(`table-sort-asc`)).toBe(true)

    cleanup?.()
    headers.forEach((header, idx) => {
      expect(header.textContent).toBe(original_texts[idx])
      expect(header.classList.contains(`table-sort-asc`)).toBe(false)
      expect(header.classList.contains(`table-sort-desc`)).toBe(false)
    })
  })

  it(`should apply custom classes and sorted_style, reset other columns`, () => {
    const table = create_table()
    sortable({
      asc_class: `asc`,
      desc_class: `desc`,
      sorted_style: { backgroundColor: `red` },
    })(table)
    const [h1, h2] = Array.from(table.querySelectorAll(`thead th`))

    h1.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(h1.classList.contains(`asc`)).toBe(true)
    expect((h1 as HTMLElement).style.backgroundColor).toBe(`red`)

    h1.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(h1.classList.contains(`desc`)).toBe(true)

    h2.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(h1.textContent).not.toContain(`↑`)
    expect(h1.classList.contains(`asc`)).toBe(false)
  })

  it(`should handle empty table body and custom header_selector`, () => {
    const table = document.createElement(`table`)
    table.innerHTML = `<thead><tr><th class="sortable">A</th><th>B</th></tr></thead>`
    document.body.appendChild(table)

    sortable({ header_selector: `th.sortable` })(table)

    expect((table.querySelector(`th.sortable`) as HTMLElement).style.cursor).toBe(
      `pointer`,
    )
    expect((table.querySelectorAll(`th`)[1] as HTMLElement).style.cursor).toBe(``)
    expect(() =>
      (table.querySelector(`th.sortable`) as HTMLElement).dispatchEvent(
        new MouseEvent(`click`),
      )
    ).not.toThrow()
  })

  it(`should restore pre-existing custom styles`, () => {
    const table = create_table()
    const header = table.querySelector(`thead th`) as HTMLElement
    header.style.color = `blue`

    const cleanup = sortable()(table)
    header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    cleanup?.()

    expect(header.style.color).toBe(`blue`)
  })
})

describe(`resizable`, () => {
  const create_element = () => {
    const element = document.createElement(`div`)
    element.style.width = `200px`
    element.style.height = `150px`
    document.body.appendChild(element)
    return element
  }

  const mock_rect = (
    element: HTMLElement,
    rect: { left: number; top: number; width: number; height: number },
  ) => {
    element.getBoundingClientRect = vi.fn(() => ({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }))
    Object.defineProperty(element, `offsetWidth`, {
      value: rect.width,
      configurable: true,
    })
    Object.defineProperty(element, `offsetHeight`, {
      value: rect.height,
      configurable: true,
    })
    Object.defineProperty(element, `offsetLeft`, { value: rect.left, configurable: true })
    Object.defineProperty(element, `offsetTop`, { value: rect.top, configurable: true })
  }

  it(`should apply resize cursor on right edge hover`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable()(element)

    // Hover on right edge (within handle_size=8 from right)
    const hover_event = new MouseEvent(`mousemove`, {
      clientX: 195,
      clientY: 75,
      bubbles: true,
    })
    element.dispatchEvent(hover_event)

    expect(element.style.cursor).toBe(`ew-resize`)
  })

  it(`should apply resize cursor on bottom edge hover`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable()(element)

    // Hover on bottom edge
    const hover_event = new MouseEvent(`mousemove`, {
      clientX: 100,
      clientY: 145,
      bubbles: true,
    })
    element.dispatchEvent(hover_event)

    expect(element.style.cursor).toBe(`ns-resize`)
  })

  it(`should apply resize cursor on left edge hover when enabled`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ edges: [`left`] })(element)

    // Hover on left edge
    const hover_event = new MouseEvent(`mousemove`, {
      clientX: 5,
      clientY: 75,
      bubbles: true,
    })
    element.dispatchEvent(hover_event)

    expect(element.style.cursor).toBe(`ew-resize`)
  })

  it(`should apply resize cursor on top edge hover when enabled`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ edges: [`top`] })(element)

    // Hover on top edge
    const hover_event = new MouseEvent(`mousemove`, {
      clientX: 100,
      clientY: 5,
      bubbles: true,
    })
    element.dispatchEvent(hover_event)

    expect(element.style.cursor).toBe(`ns-resize`)
  })

  it(`should reset cursor when not hovering on edge`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable()(element)

    // Hover on right edge first
    element.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 195,
        clientY: 75,
        bubbles: true,
      }),
    )
    expect(element.style.cursor).toBe(`ew-resize`)

    // Move to center (not on edge)
    element.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 100,
        clientY: 75,
        bubbles: true,
      }),
    )
    expect(element.style.cursor).toBe(``)
  })

  it(`should respect min_width constraint`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ min_width: 100 })(element)

    // Start resize on right edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 195,
        clientY: 75,
        bubbles: true,
      }),
    )

    // Drag to shrink width below min_width
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 50,
        clientY: 75,
        bubbles: true,
      }),
    )

    // Width should be clamped to min_width
    expect(element.style.width).toBe(`100px`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  })

  it(`should respect max_width constraint`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ max_width: 300 })(element)

    // Start resize on right edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 195,
        clientY: 75,
        bubbles: true,
      }),
    )

    // Drag to expand width beyond max_width
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 500,
        clientY: 75,
        bubbles: true,
      }),
    )

    // Width should be clamped to max_width
    expect(element.style.width).toBe(`300px`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  })

  it(`should respect min_height constraint`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ min_height: 80 })(element)

    // Start resize on bottom edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 100,
        clientY: 145,
        bubbles: true,
      }),
    )

    // Drag to shrink height below min_height
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 100,
        clientY: 30,
        bubbles: true,
      }),
    )

    // Height should be clamped to min_height
    expect(element.style.height).toBe(`80px`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  })

  it(`should respect max_height constraint`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ max_height: 250 })(element)

    // Start resize on bottom edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 100,
        clientY: 145,
        bubbles: true,
      }),
    )

    // Drag to expand height beyond max_height
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 100,
        clientY: 400,
        bubbles: true,
      }),
    )

    // Height should be clamped to max_height
    expect(element.style.height).toBe(`250px`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  })

  it(`should fire on_resize_start, on_resize, and on_resize_end callbacks`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    const on_resize_start = vi.fn()
    const on_resize = vi.fn()
    const on_resize_end = vi.fn()

    resizable({ on_resize_start, on_resize, on_resize_end })(element)

    // Start resize on right edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 195,
        clientY: 75,
        bubbles: true,
      }),
    )
    expect(on_resize_start).toHaveBeenCalledTimes(1)
    expect(on_resize_start).toHaveBeenCalledWith(
      expect.any(MouseEvent),
      { width: 200, height: 150 },
    )

    // Drag to resize
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 250,
        clientY: 75,
        bubbles: true,
      }),
    )
    expect(on_resize).toHaveBeenCalledTimes(1)
    expect(on_resize).toHaveBeenCalledWith(
      expect.any(MouseEvent),
      { width: 255, height: 150 },
    )

    // End resize
    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    expect(on_resize_end).toHaveBeenCalledTimes(1)
    expect(on_resize_end).toHaveBeenCalledWith(
      expect.any(MouseEvent),
      { width: 200, height: 150 }, // offsetWidth/Height from mock
    )
  })

  it(`should handle left edge resize with position adjustment`, () => {
    const element = create_element()
    mock_rect(element, { left: 100, top: 50, width: 200, height: 150 })
    resizable({ edges: [`left`] })(element)

    // Start resize on left edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 105,
        clientY: 100,
        bubbles: true,
      }),
    )

    // Drag left to expand
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 55,
        clientY: 100,
        bubbles: true,
      }),
    )

    // Width should increase and left position should decrease
    expect(element.style.width).toBe(`250px`)
    expect(element.style.left).toBe(`50px`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  })

  it(`should handle top edge resize with position adjustment`, () => {
    const element = create_element()
    mock_rect(element, { left: 100, top: 100, width: 200, height: 150 })
    resizable({ edges: [`top`] })(element)

    // Start resize on top edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 200,
        clientY: 105,
        bubbles: true,
      }),
    )

    // Drag up to expand
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 200,
        clientY: 55,
        bubbles: true,
      }),
    )

    // Height should increase and top position should decrease
    expect(element.style.height).toBe(`200px`)
    expect(element.style.top).toBe(`50px`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  })

  it(`should do nothing when disabled`, () => {
    const element = create_element()
    const cleanup = resizable({ disabled: true })(element)

    expect(cleanup).toBeUndefined()
    expect(element.style.cursor).toBe(``)
  })

  it(`should set position to relative if element has static positioning`, () => {
    const element = create_element()
    element.style.position = ``
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    // Mock getComputedStyle to return static position (jsdom/happy-dom doesn't properly report this)
    const original_get_computed_style = globalThis.getComputedStyle
    globalThis.getComputedStyle = vi.fn(() => ({
      position: `static`,
    })) as unknown as typeof getComputedStyle

    resizable()(element)

    expect(element.style.position).toBe(`relative`)

    globalThis.getComputedStyle = original_get_computed_style
  })

  it(`should not change position if element already has non-static positioning`, () => {
    const element = create_element()
    element.style.position = `absolute`
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    resizable()(element)

    expect(element.style.position).toBe(`absolute`)
  })

  it(`should cleanup properly and remove all event listeners`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    const cleanup = resizable()(element)

    // Set cursor first
    element.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 195,
        clientY: 75,
        bubbles: true,
      }),
    )
    expect(element.style.cursor).toBe(`ew-resize`)

    cleanup?.()
    expect(element.style.cursor).toBe(``)
  })

  it(`should use custom handle_size`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ handle_size: 20 })(element)

    // Hover at 185 (within 20px handle_size from right edge at 200)
    element.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 185,
        clientY: 75,
        bubbles: true,
      }),
    )

    expect(element.style.cursor).toBe(`ew-resize`)

    // Hover at 175 (outside 20px handle but would be inside 8px default)
    element.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 175,
        clientY: 75,
        bubbles: true,
      }),
    )

    // Should still not be on edge
    expect(element.style.cursor).toBe(``)
  })

  it(`should not start resizing when clicking outside edge areas`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    const on_resize_start = vi.fn()
    resizable({ on_resize_start })(element)

    // Click in center (not on any edge)
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 100,
        clientY: 75,
        bubbles: true,
      }),
    )

    expect(on_resize_start).not.toHaveBeenCalled()
  })

  it(`should ignore mousemove when not resizing`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    const on_resize = vi.fn()
    resizable({ on_resize })(element)

    // Dispatch global mousemove without starting resize
    globalThis.dispatchEvent(
      new MouseEvent(`mousemove`, {
        clientX: 300,
        clientY: 75,
        bubbles: true,
      }),
    )

    expect(on_resize).not.toHaveBeenCalled()
  })

  it(`should ignore mouseup when not resizing`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    const on_resize_end = vi.fn()
    resizable({ on_resize_end })(element)

    // Dispatch mouseup without starting resize
    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))

    expect(on_resize_end).not.toHaveBeenCalled()
  })

  it(`should reset userSelect on mouseup`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable()(element)

    // Start resize on right edge
    element.dispatchEvent(
      new MouseEvent(`mousedown`, {
        clientX: 195,
        clientY: 75,
        bubbles: true,
      }),
    )
    expect(document.body.style.userSelect).toBe(`none`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    expect(document.body.style.userSelect).toBe(``)
  })
})
