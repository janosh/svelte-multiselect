import {
  click_outside,
  draggable,
  get_html_sort_value,
  highlight_matches,
  resizable,
  sortable,
  tooltip,
} from '$lib/attachments'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { doc_query } from './index'

const mouse_event = (type: string, clientX: number, clientY: number) =>
  new MouseEvent(type, { clientX, clientY, bubbles: true })

describe(`get_html_sort_value`, () => {
  const create_element = (tag = `div`) => document.createElement(tag)
  const add_data_sort = (element: HTMLElement, value: string) =>
    element.setAttribute(`data-sort-value`, value)
  const add_text = (element: HTMLElement, text: string) => (element.textContent = text)

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
    child.append(grandchild)
    parent.append(child)
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

  it(`should return empty string for null textContent`, () => {
    const element = create_element()
    Object.defineProperty(element, `textContent`, { value: null })
    expect(get_html_sort_value(element)).toBe(``)
  })
})

describe(`tooltip`, () => {
  const create_element = (tag = `div`) => {
    const element = document.createElement(tag)
    document.body.append(element)
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

  const mock_viewport = (width: number, height: number) => {
    const original_width = globalThis.innerWidth
    const original_height = globalThis.innerHeight
    Object.defineProperty(globalThis, `innerWidth`, { configurable: true, value: width })
    Object.defineProperty(globalThis, `innerHeight`, {
      configurable: true,
      value: height,
    })
    return () => {
      Object.defineProperty(globalThis, `innerWidth`, {
        configurable: true,
        value: original_width,
      })
      Object.defineProperty(globalThis, `innerHeight`, {
        configurable: true,
        value: original_height,
      })
    }
  }

  const mock_tooltip_size = (width: number, height: number) => {
    const original_offset_width = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      `offsetWidth`,
    )
    const original_offset_height = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      `offsetHeight`,
    )

    const bounds_spy = vi
      .spyOn(HTMLElement.prototype, `getBoundingClientRect`)
      .mockImplementation(function (this: HTMLElement) {
        const is_tooltip = this.classList.contains(`custom-tooltip`)
        return {
          left: 0,
          top: 0,
          width: is_tooltip ? width : 0,
          height: is_tooltip ? height : 0,
          right: is_tooltip ? width : 0,
          bottom: is_tooltip ? height : 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })

    Object.defineProperty(HTMLElement.prototype, `offsetWidth`, {
      configurable: true,
      get() {
        if (this.classList.contains(`custom-tooltip`)) return width
        return original_offset_width?.get?.call(this) ?? 0
      },
    })
    Object.defineProperty(HTMLElement.prototype, `offsetHeight`, {
      configurable: true,
      get() {
        if (this.classList.contains(`custom-tooltip`)) return height
        return original_offset_height?.get?.call(this) ?? 0
      },
    })

    return () => {
      bounds_spy.mockRestore()
      if (original_offset_width) {
        Object.defineProperty(HTMLElement.prototype, `offsetWidth`, original_offset_width)
      }
      if (original_offset_height) {
        Object.defineProperty(
          HTMLElement.prototype,
          `offsetHeight`,
          original_offset_height,
        )
      }
    }
  }

  const with_mocked_tooltip_geometry = (
    viewport: { width: number; height: number },
    tooltip_size: { width: number; height: number },
    callback: () => void,
  ) => {
    const restore_viewport = mock_viewport(viewport.width, viewport.height)
    const restore_tooltip_size = mock_tooltip_size(
      tooltip_size.width,
      tooltip_size.height,
    )
    try {
      callback()
    } finally {
      restore_tooltip_size()
      restore_viewport()
    }
  }

  // Intercepts cssText assignments and setProperty calls at the prototype level.
  // Needed because happy-dom strips var()/light-dark() from parsed style values.
  const capture_style_writes = () => {
    const css_texts: string[] = []
    const set_prop_values: string[] = []
    const orig_css_desc = Object.getOwnPropertyDescriptor(
      CSSStyleDeclaration.prototype,
      `cssText`,
    )
    Object.defineProperty(CSSStyleDeclaration.prototype, `cssText`, {
      configurable: true,
      enumerable: orig_css_desc?.enumerable,
      get() {
        return orig_css_desc?.get?.call(this) ?? ``
      },
      set(value: string) {
        css_texts.push(value)
        orig_css_desc?.set?.call(this, value)
      },
    })
    // eslint-disable-next-line @typescript-eslint/unbound-method -- storing for prototype swap, called with .call(this)
    const orig_set_prop = CSSStyleDeclaration.prototype.setProperty
    CSSStyleDeclaration.prototype.setProperty = function (
      prop: string,
      val: string | null,
      priority?: string,
    ) {
      if (val) set_prop_values.push(`${prop}: ${val}`)
      return orig_set_prop.call(this, prop, val, priority)
    }
    return {
      css_texts,
      set_prop_values,
      restore: () => {
        CSSStyleDeclaration.prototype.setProperty = orig_set_prop
        if (orig_css_desc) {
          Object.defineProperty(CSSStyleDeclaration.prototype, `cssText`, orig_css_desc)
        }
      },
    }
  }

  const find_tooltip_css = (css_texts: string[]) =>
    css_texts.find((text) => text.includes(`z-index`) && text.includes(`9999`))

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
      expect(element.getAttribute(`data-original-title`)).toBe(`Title content`)
      expect(element.hasAttribute(`title`)).toBe(false)
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
  })

  describe(`Configuration Options`, () => {
    it(`should handle disabled option`, () => {
      const element = create_element()
      element.title = `Disabled tooltip`
      const cleanup = setup_tooltip(element, { disabled: true })
      expect(cleanup).toBeUndefined()
      expect(element.hasAttribute(`data-original-title`)).toBe(false)
      expect(element.getAttribute(`title`)).toBe(`Disabled tooltip`)
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
      parent.append(child)
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
        current.append(child)
        current = child
      }
      setup_tooltip(parent)
      expect(parent.querySelectorAll(`[data-original-title]`)).toHaveLength(5)
    })

    it(`should not setup children added after initialization`, () => {
      const parent = create_element()
      setup_tooltip(parent)
      const child = document.createElement(`div`)
      child.title = `Dynamic`
      parent.append(child)
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

    it.each([
      [`with custom content`, { content: `Custom content` }],
      [`without custom content`, {}],
    ])(`suppresses dynamically set title %s`, async (_desc, tooltip_options) => {
      const element = create_element()
      element.setAttribute(`aria-label`, `initial label`)
      const cleanup = setup_tooltip(element, tooltip_options)

      element.setAttribute(`title`, `Late title`)
      await Promise.resolve()

      expect(element.hasAttribute(`title`)).toBe(false)
      expect(element.getAttribute(`data-original-title`)).toBe(`Late title`)

      cleanup?.()
      expect(element.getAttribute(`title`)).toBe(`Late title`)
      expect(element.hasAttribute(`data-original-title`)).toBe(false)
    })
  })

  describe(`Error Handling`, () => {
    it.each([
      [`null element`, null],
      [`undefined element`, undefined],
    ])(`should handle %s gracefully`, (_desc, el) => {
      const attach = tooltip()
      // @ts-expect-error testing null/undefined inputs
      expect(attach(el)).toBeUndefined()
    })
  })

  describe(`Reactive Content and Scroll Behavior`, () => {
    // MutationObserver callbacks don't fire in happy-dom, so we test setup/cleanup/ownership.
    beforeEach(() => vi.useFakeTimers())

    it(`tracks tooltip ownership via owner_element property`, () => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })
      trigger_tooltip(element)

      expect(Reflect.get(doc_query(`.custom-tooltip`), `owner_element`)).toBe(element)
    })

    it.each([
      [`unrelated element keeps tooltip`, () => document.createElement(`div`), true],
      [`document hides tooltip`, () => document, false],
    ])(`scroll from %s`, (_desc, get_target, should_persist) => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })
      trigger_tooltip(element)
      expect(doc_query(`.custom-tooltip`)).toBeInstanceOf(HTMLElement)

      const scroll_event = new Event(`scroll`, { bubbles: true })
      Object.defineProperty(scroll_event, `target`, { value: get_target() })
      globalThis.dispatchEvent(scroll_event)
      expect(document.querySelector(`.custom-tooltip`)).toEqual(
        should_persist ? expect.any(HTMLDivElement) : null,
      )
    })

    it(`scroll from ancestor hides tooltip`, () => {
      const ancestor = document.createElement(`div`)
      const element = create_element()
      ancestor.append(element)
      document.body.append(ancestor)
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })
      trigger_tooltip(element)

      const scroll_event = new Event(`scroll`, { bubbles: true })
      Object.defineProperty(scroll_event, `target`, { value: ancestor })
      globalThis.dispatchEvent(scroll_event)

      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
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

      expect(document.querySelectorAll(`.custom-tooltip`)).toHaveLength(1)
      expect(doc_query(`.custom-tooltip`).textContent).toContain(`tooltip2`)
    })

    it(`shows/hides on focus/blur for accessibility`, () => {
      const element = create_element(`button`)
      element.title = `focus tooltip`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })

      element.dispatchEvent(new FocusEvent(`focus`, { bubbles: true }))
      vi.runAllTimers()
      expect(doc_query(`.custom-tooltip`)).toBeInstanceOf(HTMLElement)

      element.dispatchEvent(new FocusEvent(`blur`, { bubbles: true }))
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })
  })

  describe(`Cross-Instance Cleanup`, () => {
    beforeEach(() => vi.useFakeTimers())

    it(`cleanup of one instance keeps another instance's visible tooltip`, () => {
      const [el_a, el_b] = [create_element(), create_element()]
      el_a.title = `tooltip A`
      el_b.title = `tooltip B`
      mock_bounds(el_a)
      mock_bounds(el_b)
      const cleanup_a = setup_tooltip(el_a, { delay: 0 })
      setup_tooltip(el_b, { delay: 0 })

      trigger_tooltip(el_b)
      expect(doc_query(`.custom-tooltip`).textContent).toContain(`tooltip B`)

      cleanup_a?.()
      expect(document.querySelector(`.custom-tooltip`)?.textContent).toContain(
        `tooltip B`,
      )
    })

    it(`cleanup of one instance keeps another instance's pending show`, () => {
      const [el_a, el_b] = [create_element(), create_element()]
      el_a.title = `tooltip A`
      el_b.title = `tooltip B`
      mock_bounds(el_a)
      mock_bounds(el_b)
      const cleanup_a = setup_tooltip(el_a, { delay: 100 })
      setup_tooltip(el_b, { delay: 100 })

      el_b.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      cleanup_a?.() // must not cancel B's pending show timeout

      vi.runAllTimers()
      expect(document.querySelector(`.custom-tooltip`)?.textContent).toContain(
        `tooltip B`,
      )
    })

    it(`cleanup cancels its own pending show`, () => {
      const element = create_element()
      element.title = `own pending`
      mock_bounds(element)
      const cleanup = setup_tooltip(element, { delay: 100 })

      element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      cleanup?.()

      vi.runAllTimers()
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })

    it(`removing the element from the DOM cancels its pending show`, async () => {
      const element = create_element()
      element.title = `pending on removed element`
      mock_bounds(element)
      setup_tooltip(element, { delay: 100 })

      element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      element.remove() // element leaves the DOM before the show delay elapses
      // MutationObserver callbacks are microtasks — flush before advancing timers
      await Promise.resolve()

      vi.runAllTimers()
      // previously the timeout still fired and appended an orphaned tooltip
      // positioned against the detached element
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })
  })

  describe(`New Features`, () => {
    beforeEach(() => vi.useFakeTimers())

    it.each([
      {
        test_name: `auto-flips bottom to top when bottom overflows`,
        trigger_bounds: { left: 100, top: 120, width: 40, height: 20 },
        viewport: { width: 300, height: 180 },
        tooltip_size: { width: 120, height: 60 },
        expected_placement: `top`,
      },
      {
        test_name: `falls back to right when top and bottom overflow`,
        trigger_bounds: { left: 100, top: 40, width: 40, height: 20 },
        viewport: { width: 320, height: 120 },
        tooltip_size: { width: 80, height: 70 },
        expected_placement: `right`,
      },
      {
        test_name: `falls back to left when right also overflows`,
        trigger_bounds: { left: 260, top: 40, width: 40, height: 20 },
        viewport: { width: 320, height: 120 },
        tooltip_size: { width: 80, height: 70 },
        expected_placement: `left`,
      },
      {
        test_name: `keeps bottom placement when there is no overflow`,
        trigger_bounds: { left: 100, top: 100, width: 40, height: 20 },
        viewport: { width: 320, height: 300 },
        tooltip_size: { width: 120, height: 60 },
        expected_placement: `bottom`,
      },
      {
        test_name: `auto-flips top to bottom when top overflows`,
        trigger_bounds: { left: 100, top: 30, width: 40, height: 20 },
        viewport: { width: 300, height: 300 },
        tooltip_size: { width: 120, height: 60 },
        expected_placement: `bottom`,
        requested_placement: `top`,
      },
      {
        test_name: `auto-flips left to right when left overflows`,
        trigger_bounds: { left: 30, top: 100, width: 40, height: 20 },
        viewport: { width: 300, height: 300 },
        tooltip_size: { width: 80, height: 40 },
        expected_placement: `right`,
        requested_placement: `left`,
      },
      {
        test_name: `auto-flips right to left when right overflows`,
        trigger_bounds: { left: 230, top: 100, width: 40, height: 20 },
        viewport: { width: 300, height: 300 },
        tooltip_size: { width: 80, height: 40 },
        expected_placement: `left`,
        requested_placement: `right`,
      },
    ])(
      `$test_name`,
      ({
        trigger_bounds,
        viewport,
        tooltip_size,
        expected_placement,
        requested_placement,
      }) => {
        // Arrow points away from trigger: offset side has negative value, opposite side is unset
        const arrow_offset_side: Record<string, [string, string]> = {
          top: [`bottom`, `top`],
          bottom: [`top`, `bottom`],
          left: [`right`, `left`],
          right: [`left`, `right`],
        }

        with_mocked_tooltip_geometry(viewport, tooltip_size, () => {
          const element = create_element()
          element.title = `test`
          mock_bounds(element, trigger_bounds)
          setup_tooltip(element, { delay: 0, placement: requested_placement ?? `bottom` })

          trigger_tooltip(element)
          const tooltip_el = doc_query(`.custom-tooltip`)
          expect(tooltip_el.getAttribute(`data-placement`)).toBe(expected_placement)
          const arrow = doc_query(`.custom-tooltip-arrow`)

          const [set_side, empty_side] = arrow_offset_side[expected_placement]
          expect(arrow?.style.getPropertyValue(set_side)).toContain(`-`)
          expect(arrow?.style.getPropertyValue(empty_side)).toBe(``)
        })
      },
    )

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
      expect(doc_query(`.custom-tooltip`)).toBeInstanceOf(HTMLElement)

      element.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
      expect(document.querySelector(`.custom-tooltip`)).toEqual(
        visible_after_leave ? expect.any(HTMLDivElement) : null,
      )

      if (delay_ms > 0) {
        vi.advanceTimersByTime(delay_ms)
        expect(document.querySelector(`.custom-tooltip`)).toBeNull()
      }
    })

    it(`mouseleave before delay expires cancels pending tooltip`, () => {
      const element = create_element()
      element.title = `delayed tooltip`
      mock_bounds(element)
      setup_tooltip(element, { delay: 100 })

      element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      vi.advanceTimersByTime(99)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()

      element.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
      vi.advanceTimersByTime(1)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })

    it(`disabled: 'touch-devices' skips tooltip on touch input`, () => {
      // With runtime detection, tooltip is set up but skipped when last pointer was touch
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      const cleanup = setup_tooltip(element, { delay: 0, disabled: `touch-devices` })

      // Simulate touch input, then try to show tooltip
      document.dispatchEvent(
        new PointerEvent(`pointerdown`, { pointerType: `touch`, bubbles: true }),
      )
      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull() // No tooltip on touch

      // Simulate mouse input, then show tooltip
      document.dispatchEvent(
        new PointerEvent(`pointerdown`, { pointerType: `mouse`, bubbles: true }),
      )
      trigger_tooltip(element)
      expect(doc_query(`.custom-tooltip`)).toBeInstanceOf(HTMLElement) // Tooltip works with mouse

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
      expect(doc_query(`.custom-tooltip`)).toBeInstanceOf(HTMLElement)

      document.dispatchEvent(new KeyboardEvent(`keydown`, { key }))
      expect(document.querySelector(`.custom-tooltip`)).toEqual(
        should_remain ? expect.any(HTMLDivElement) : null,
      )
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

      const tooltip_el = doc_query(`.custom-tooltip`)
      const arrow = tooltip_el.querySelector(`.custom-tooltip-arrow`)
      expect(arrow).toEqual(expect_arrow ? expect.any(HTMLDivElement) : null)
    })

    it(`manages aria-describedby on show/hide`, () => {
      const element = create_element()
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })

      expect(element.hasAttribute(`aria-describedby`)).toBe(false)

      trigger_tooltip(element)
      const tooltip_el = doc_query(`.custom-tooltip`)
      expect(tooltip_el.getAttribute(`role`)).toBe(`tooltip`)
      expect(tooltip_el.id).toMatch(/^tooltip-/u)
      expect(element.getAttribute(`aria-describedby`)).toBe(tooltip_el.id)

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
      expect(doc_query(`.custom-tooltip`).style.top).toBe(`${expected_top}px`)
    })

    it.each([
      [`allow_html: false uses textContent`, false, `<b>bold</b>`, `<b>bold</b>`],
      [`allow_html: true uses innerHTML`, true, `<b>bold</b>`, `bold`],
      [
        `allow_html: undefined (default) uses textContent`,
        undefined,
        `<b>bold</b>`,
        `<b>bold</b>`,
      ],
    ])(`%s`, (_desc, allow_html, content, expected_text) => {
      const element = create_element()
      element.title = content
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, allow_html })

      trigger_tooltip(element)
      expect(doc_query(`.custom-tooltip`).textContent).toBe(expected_text)
    })

    it.each([
      [`called and strips XSS`, true, `<script>xss</script>Safe`, 1, `Safe`],
      [`skipped when allow_html: false`, false, `Plain`, 0, `Plain`],
    ])(`sanitize_html %s`, (_desc, allow_html, title, call_count, expected_text) => {
      const sanitizer = vi.fn((html: string) =>
        html.replaceAll(/<script[^>]*>.*?<\/script>/giu, ``),
      )
      const element = create_element()
      element.title = title
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, allow_html, sanitize_html: sanitizer })

      trigger_tooltip(element)
      expect(sanitizer).toHaveBeenCalledTimes(call_count)
      expect(doc_query(`.custom-tooltip`).textContent).toBe(expected_text)
    })

    it(`tooltip uses theme-aware light-dark() defaults`, () => {
      // Base styles must not carry a color-scheme (page-declared schemes stay in
      // control, see #405); the schemeless-page fallback is covered below. Asserts
      // via raw cssText/setProperty spies because happy-dom strips var()/light-dark().
      const { css_texts, set_prop_values, restore } = capture_style_writes()
      try {
        const element = create_element()
        element.title = `bg test`
        mock_bounds(element)
        setup_tooltip(element, { delay: 0 })
        trigger_tooltip(element)
      } finally {
        restore()
      }

      const tooltip_css = find_tooltip_css(css_texts)
      expect(tooltip_css).toBeDefined()
      expect(tooltip_css).not.toContain(`color-scheme`)
      expect(tooltip_css).toMatch(/background-color:.*light-dark\(\s*#fff,\s*#2a2a2e/u)
      expect(tooltip_css).toMatch(/\bcolor:.*light-dark\(\s*#222,\s*#eee/u)
      expect(tooltip_css).toMatch(
        /border:.*var\(--tooltip-border,\s*1px solid light-dark\(\s*lightgray,\s*#555\)/u,
      )

      const arrow_borders = set_prop_values.filter(
        (entry) =>
          entry.startsWith(`border-`) &&
          entry.includes(`solid`) &&
          !entry.includes(`transparent`),
      )
      expect(arrow_borders.length).toBeGreaterThan(0)
      for (const entry of arrow_borders) {
        expect(entry).toMatch(/light-dark\(\s*#fff,\s*#2a2a2e/u)
      }
    })

    it(`custom --tooltip-bg overrides default background`, () => {
      const { css_texts, restore } = capture_style_writes()
      try {
        const element = create_element()
        element.title = `custom bg`
        element.style.setProperty(`--tooltip-bg`, `red`)
        mock_bounds(element)
        setup_tooltip(element, { delay: 0 })
        trigger_tooltip(element)
      } finally {
        restore()
      }

      expect(doc_query(`.custom-tooltip`).style.getPropertyValue(`--tooltip-bg`)).toBe(
        `red`,
      )
      const tooltip_css = find_tooltip_css(css_texts)
      expect(tooltip_css).toContain(`var(--tooltip-bg,`)
    })

    // Dark-styled pages that never declare `color-scheme` resolve the default
    // light-dark() background to LIGHT while their inherited --text-color may be
    // near-white → unreadable tooltip. The fallback pairs scheme + text color.
    it(`pairs color-scheme and text color when page declares no scheme`, () => {
      const { set_prop_values, restore } = capture_style_writes()
      try {
        const element = create_element()
        element.title = `scheme fallback`
        mock_bounds(element)
        setup_tooltip(element, { delay: 0 })
        trigger_tooltip(element)
      } finally {
        restore()
      }

      expect(set_prop_values).toContain(`color-scheme: light dark`)
      expect(set_prop_values).toContain(`--text-color: light-dark(#222, #eee)`)
    })

    it.each([
      [
        `page declares a color-scheme`,
        (_element: HTMLElement) => (document.body.style.colorScheme = `dark`),
      ],
      [
        `trigger customizes --tooltip-bg`,
        (element: HTMLElement) => element.style.setProperty(`--tooltip-bg`, `red`),
      ],
      [
        `trigger carries its own --text-color`,
        (element: HTMLElement) => element.style.setProperty(`--text-color`, `#0ff`),
      ],
    ])(`scheme fallback is skipped when %s`, (_desc, customize) => {
      const { set_prop_values, restore } = capture_style_writes()
      try {
        const element = create_element()
        element.title = `no fallback`
        customize(element)
        mock_bounds(element)
        setup_tooltip(element, { delay: 0 })
        trigger_tooltip(element)
      } finally {
        restore()
        document.body.style.colorScheme = ``
      }

      expect(set_prop_values).not.toContain(`color-scheme: light dark`)
      expect(set_prop_values).not.toContain(`--text-color: light-dark(#222, #eee)`)
    })

    it(`scheme fallback still applies when only the trigger has a color-scheme`, () => {
      // A scheme on the trigger (or some container around it) never reaches the
      // tooltip since it's appended to document.body, so it must not suppress the
      // fallback — only a page-level (body-inherited) scheme should.
      const { set_prop_values, restore } = capture_style_writes()
      try {
        const element = create_element()
        element.title = `trigger scheme`
        element.style.colorScheme = `dark`
        mock_bounds(element)
        setup_tooltip(element, { delay: 0 })
        trigger_tooltip(element)
      } finally {
        restore()
      }

      expect(set_prop_values).toContain(`color-scheme: light dark`)
      expect(set_prop_values).toContain(`--text-color: light-dark(#222, #eee)`)
    })

    it(`custom --tooltip-border overrides default border`, () => {
      const { css_texts, restore } = capture_style_writes()
      try {
        const element = create_element()
        element.title = `custom border`
        element.style.setProperty(`--tooltip-border`, `2px solid red`)
        mock_bounds(element)
        setup_tooltip(element, { delay: 0 })
        trigger_tooltip(element)
      } finally {
        restore()
      }

      expect(
        doc_query(`.custom-tooltip`).style.getPropertyValue(`--tooltip-border`),
      ).toBe(`2px solid red`)
      const tooltip_css = find_tooltip_css(css_texts)
      expect(tooltip_css).toContain(`var(--tooltip-border,`)
    })

    it(`updates visible tooltip content when tooltip attributes change`, () => {
      const mutation_callbacks: MutationCallback[] = []
      const original_mutation_observer = globalThis.MutationObserver
      class MockMutationObserver implements MutationObserver {
        observe = vi.fn((_target: Node, _options?: MutationObserverInit): void => {})
        disconnect = vi.fn((): void => {})
        takeRecords = vi.fn((): MutationRecord[] => [])
        constructor(callback: MutationCallback) {
          mutation_callbacks.push(callback)
        }
      }
      globalThis.MutationObserver = MockMutationObserver
      window.MutationObserver = MockMutationObserver

      try {
        const element = create_element()
        element.title = `initial tooltip`
        mock_bounds(element)
        setup_tooltip(element, { delay: 0 })
        trigger_tooltip(element)
        expect(doc_query(`.tooltip-content`).textContent).toBe(`initial tooltip`)

        element.setAttribute(`aria-label`, `updated tooltip`)
        const empty_nodes = document.querySelectorAll(`.__missing__`)
        mutation_callbacks[0]?.(
          [
            {
              type: `attributes`,
              attributeName: `aria-label`,
              attributeNamespace: null,
              oldValue: null,
              target: element,
              addedNodes: empty_nodes,
              removedNodes: empty_nodes,
              nextSibling: null,
              previousSibling: null,
            },
          ],
          new MockMutationObserver(() => {}),
        )

        expect(doc_query(`.tooltip-content`).textContent).toBe(`updated tooltip`)
      } finally {
        globalThis.MutationObserver = original_mutation_observer
        window.MutationObserver = original_mutation_observer
      }
    })

    it(`applies valid custom style declarations and ignores malformed ones`, () => {
      const element = create_element()
      element.title = `custom style`
      mock_bounds(element)
      setup_tooltip(element, {
        delay: 0,
        style: `background-color: red; color: blue; invalid; empty:`,
      })

      trigger_tooltip(element)
      const tooltip_el = doc_query(`.custom-tooltip`)
      expect(tooltip_el.style.backgroundColor).toBe(`red`)
      expect(tooltip_el.style.color).toBe(`blue`)
      expect(tooltip_el.style.getPropertyValue(`invalid`)).toBe(``)
      expect(tooltip_el.style.getPropertyValue(`empty`)).toBe(``)
    })

    it(`preserves custom style values containing colons`, () => {
      const element = create_element()
      element.title = `custom style url`
      mock_bounds(element)
      setup_tooltip(element, {
        delay: 0,
        style: `background-image: url("https://example.com/tooltip.svg")`,
      })

      trigger_tooltip(element)
      expect(doc_query(`.custom-tooltip`).style.backgroundImage).toContain(
        `https://example.com/tooltip.svg`,
      )
    })

    it.each([
      [`LF`, `line1\nline2`],
      [`CRLF`, `line1\r\nline2`],
      [`CR`, `line1\rline2`],
    ])(`converts %s newlines to <br/> in allow_html content`, (_desc, content) => {
      const element = create_element()
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, allow_html: true, content })

      trigger_tooltip(element)
      const content_el = doc_query(`.tooltip-content`)
      expect(content_el.querySelectorAll(`br`)).toHaveLength(1)
      expect(content_el.textContent).toBe(`line1line2`)
    })

    it(`uses custom style background-color for tooltip arrow fill`, () => {
      const { set_prop_values, restore } = capture_style_writes()
      try {
        const element = create_element()
        element.title = `custom arrow fill`
        mock_bounds(element)
        setup_tooltip(element, {
          delay: 0,
          style: `background-color: red`,
        })
        trigger_tooltip(element)
      } finally {
        restore()
      }

      const arrow_borders = set_prop_values.filter(
        (entry) =>
          entry.startsWith(`border-`) &&
          entry.includes(`solid`) &&
          !entry.includes(`transparent`),
      )
      expect(
        arrow_borders.some((entry) => /\b(?:red|rgb\(255,\s*0,\s*0\))/u.test(entry)),
      ).toBe(true)
    })
  })
})

describe(`click_outside`, () => {
  const create_element = () => {
    const element = document.createElement(`div`)
    document.body.append(element)
    return element
  }

  const dispatch_click = (target: Element, path: EventTarget[] = []) => {
    const event = new Event(`click`, { bubbles: true })
    Object.defineProperty(event, `target`, { value: target })
    Object.defineProperty(event, `composedPath`, {
      value: () =>
        path.length > 0
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
    excluded1.append(nested)
    excluded1.closest = vi.fn((sel) => (sel === `.modal` ? excluded1 : null))
    excluded2.closest = vi.fn((sel) => (sel === `.popover` ? excluded2 : null))
    nested.closest = vi.fn((sel) => (sel === `.modal` ? excluded1 : null))

    const callback = vi.fn()
    click_outside({ callback, exclude: [`.modal`, `.popover`] })(element)

    dispatch_click(excluded1)
    dispatch_click(excluded2)
    dispatch_click(nested)
    expect(callback).not.toHaveBeenCalled()
  })

  it(`should trigger on clicks landing on SVG elements outside the node`, () => {
    const element = create_element()
    const callback = vi.fn()
    click_outside({ callback })(element)

    const svg = document.createElementNS(`http://www.w3.org/2000/svg`, `svg`)
    document.body.append(svg)
    dispatch_click(svg)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it(`should dispatch custom event (with or without callback)`, () => {
    const element = create_element()
    const listener = vi.fn()
    element.addEventListener(`outside-click`, listener)
    click_outside({})(element) // no callback
    dispatch_click(create_element())
    expect(listener).toHaveBeenCalled()
  })

  it(`cleanup stops triggering callbacks`, () => {
    const element = create_element()
    const callback = vi.fn()
    const cleanup = click_outside({ callback })(element)

    dispatch_click(create_element())
    expect(callback).toHaveBeenCalledTimes(1)

    cleanup?.()
    dispatch_click(create_element())
    expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
  })
})

describe(`draggable`, () => {
  const create_element = () => {
    const element = document.createElement(`div`)
    document.body.append(element)
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

    draggable()(element)

    element.dispatchEvent(mouse_event(`mousedown`, 100, 100))

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
    element.dispatchEvent(mouse_event(`mousedown`, 5, 5))

    globalThis.dispatchEvent(mouse_event(`mousemove`, 15, 25))
    expect(element.style.left).toBe(`20px`)
    expect(element.style.top).toBe(`40px`)

    const mouseup = new MouseEvent(`mouseup`, { bubbles: true })
    globalThis.dispatchEvent(mouseup)

    cleanup?.()
    const position_after_cleanup = [element.style.left, element.style.top]
    globalThis.dispatchEvent(mouse_event(`mousemove`, 100, 100))
    expect([element.style.left, element.style.top]).toEqual(position_after_cleanup)
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

    element.dispatchEvent(mouse_event(`mousedown`, 0, 0))
    expect(on_drag_start).toHaveBeenCalledTimes(1)
    expect(element.style.cursor).toBe(`grabbing`)
    expect(document.body.style.userSelect).toBe(`none`)

    globalThis.dispatchEvent(mouse_event(`mousemove`, 10, 10))
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
    element.append(handle)

    const attach = draggable({ handle_selector: `.drag-handle` })
    attach(element)

    // mousedown on element (not handle) should not start dragging
    element.dispatchEvent(mouse_event(`mousedown`, 0, 0))
    globalThis.dispatchEvent(mouse_event(`mousemove`, 50, 50))
    expect(element.style.left).toBe(``)
    expect(element.style.top).toBe(``)

    // mousedown on handle should start dragging
    handle.dispatchEvent(mouse_event(`mousedown`, 0, 0))
    globalThis.dispatchEvent(mouse_event(`mousemove`, 30, 40))
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

    element.dispatchEvent(mouse_event(`mousedown`, 10, 10))

    expect(element.style.left).toBe(`25px`)
    expect(element.style.top).toBe(`35px`)

    // Drag to new position
    globalThis.dispatchEvent(mouse_event(`mousemove`, 30, 50))
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
    globalThis.dispatchEvent(mouse_event(`mousemove`, 100, 100))

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

  it(`should reset body userSelect and cursor when cleaned up mid-drag`, () => {
    const element = create_element()
    element.style.position = `fixed`
    mock_rect(element, { left: 0, top: 0 })

    const cleanup = draggable()(element)
    element.dispatchEvent(mouse_event(`mousedown`, 5, 5))
    expect(document.body.style.userSelect).toBe(`none`)
    expect(element.style.cursor).toBe(`grabbing`)

    cleanup?.() // unmount mid-drag, before any mouseup
    expect(document.body.style.userSelect).toBe(``)
    expect(element.style.cursor).toBe(``)
  })
})

describe(`highlight_matches`, () => {
  let mock_element: HTMLElement
  let mock_css_highlights: Map<string, unknown>
  let clear_highlights_spy: ReturnType<typeof vi.fn>
  let set_highlights_spy: ReturnType<typeof vi.fn>
  let delete_highlights_spy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mock_element = document.createElement(`div`)
    mock_css_highlights = new Map()
    clear_highlights_spy = vi.fn(() => mock_css_highlights.clear())
    set_highlights_spy = vi.fn((key: string, value: unknown) =>
      mock_css_highlights.set(key, value),
    )
    delete_highlights_spy = vi.fn((key: string) => mock_css_highlights.delete(key))

    const css_mock = {
      highlights: {
        clear: clear_highlights_spy,
        set: set_highlights_spy,
        delete: delete_highlights_spy,
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
      node_filter,
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
        expect(clear_highlights_spy).toHaveBeenCalledTimes(0)
        if (expected_set_calls > 0) {
          expect(set_highlights_spy).toHaveBeenCalledWith(
            `highlight-match`,
            expect.any(Object),
          )
        }
      }
    },
  )

  it(`fuzzy highlighting marks matching characters in order`, () => {
    mock_element.innerHTML = `<p>allow-user-options</p>`

    highlight_matches({ query: `auo`, fuzzy: true })(mock_element)

    const highlight = mock_css_highlights.get(`highlight-match`)
    expect(highlight).toHaveProperty(`ranges`)
    if (!highlight || typeof highlight !== `object` || !(`ranges` in highlight)) {
      throw new Error(`Expected highlight with ranges`)
    }
    const ranges = highlight.ranges
    if (!Array.isArray(ranges)) throw new Error(`Expected ranges array`)
    expect(ranges.map((range) => [range.startOffset, range.endOffset])).toEqual([
      [0, 1],
      [6, 7],
      [11, 12],
    ])
  })

  // 'İ' (U+0130) lowercases to 2 UTF-16 units, shifting offsets computed on the
  // lowercased text. Ranges must map back to the ORIGINAL character positions
  // (and never exceed the node length). 'İİİab': lowered is 'i̇i̇i̇ab' so naive
  // offsets for 'a'/'b' would be 6/7 — the correct original offsets are 3/4.
  it.each([
    [`substring`, false],
    [`fuzzy`, true],
  ])(
    `%s highlighting maps offsets back to original text when lowercasing changes length`,
    (_desc, fuzzy) => {
      mock_element.innerHTML = `<p>İİİab</p>`

      expect(() => highlight_matches({ query: `ab`, fuzzy })(mock_element)).not.toThrow()
      const highlight = mock_css_highlights.get(`highlight-match`)
      if (!highlight || typeof highlight !== `object` || !(`ranges` in highlight)) {
        throw new Error(`Expected highlight with ranges`)
      }
      const ranges = highlight.ranges
      if (!Array.isArray(ranges)) throw new Error(`Expected ranges array`)
      const offsets = ranges.map((range) => [range.startOffset, range.endOffset])
      // substring: one 'ab' range; fuzzy: single-char ranges for 'a' and 'b'
      expect(offsets).toEqual(
        fuzzy
          ? [
              [3, 4],
              [4, 5],
            ]
          : [[3, 5]],
      )
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
    expect(clear_highlights_spy).not.toHaveBeenCalled()
  })

  it(`cleanup removes only its own highlight entry`, () => {
    mock_css_highlights.set(`other-highlight`, `existing highlight`)
    mock_element.innerHTML = `<p>test content</p>`

    const cleanup = highlight_matches({ query: `test` })(mock_element)
    cleanup?.()

    expect(delete_highlights_spy).toHaveBeenCalledWith(`highlight-match`)
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)
    expect(mock_css_highlights.has(`other-highlight`)).toBe(true)
  })
})

describe(`sortable`, () => {
  const get_required_header = (
    table: HTMLTableElement,
    selector = `thead th`,
  ): HTMLTableCellElement => {
    const header = table.querySelector(selector)
    if (!(header instanceof HTMLTableCellElement)) {
      throw new Error(`expected table header '${selector}'`)
    }
    return header
  }

  const create_table = () => {
    const table = document.createElement(`table`)
    const thead = document.createElement(`thead`)
    const tr = document.createElement(`tr`)
    ;[`Planet`, `Moons`].forEach((text) => {
      const th = document.createElement(`th`)
      th.textContent = text
      tr.append(th)
    })
    thead.append(tr)
    table.append(thead)

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
      tbody.append(row)
    })
    table.append(tbody)
    document.body.append(table)
    return table
  }

  const get_column_values = (table: HTMLTableElement, col_idx: number) =>
    Array.from(table.querySelectorAll(`tbody tr`)).map(
      (row) => row.children[col_idx].textContent,
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
    expect(get_required_header(table).style.cursor).toBe(``)
  })

  it(`should add pointer cursor and fully restore on cleanup`, () => {
    const table = create_table()
    const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>(`thead th`))
    const original_texts = headers.map((h) => h.textContent)

    const cleanup = sortable()(table)
    headers.forEach((header) => expect(header.style.cursor).toBe(`pointer`))

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
    const [h1, h2] = Array.from(table.querySelectorAll<HTMLTableCellElement>(`thead th`))

    h1.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(h1.classList.contains(`asc`)).toBe(true)
    expect(h1.style.backgroundColor).toBe(`red`)

    h1.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(h1.classList.contains(`desc`)).toBe(true)

    h2.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(h1.textContent).not.toContain(`↑`)
    expect(h1.classList.contains(`asc`)).toBe(false)
  })

  it(`should handle empty table body and custom header_selector`, () => {
    const table = document.createElement(`table`)
    table.innerHTML = `<thead><tr><th class="sortable">A</th><th>B</th></tr></thead>`
    document.body.append(table)

    sortable({ header_selector: `th.sortable` })(table)

    const sortable_header = get_required_header(table, `th.sortable`)
    const second_header = table.querySelectorAll<HTMLTableCellElement>(`th`)[1]
    expect(sortable_header.style.cursor).toBe(`pointer`)
    expect(second_header?.style.cursor).toBe(``)
    sortable_header.dispatchEvent(new MouseEvent(`click`))
    expect(sortable_header.textContent).toBe(`A ↑`)
    expect(sortable_header.classList.contains(`table-sort-asc`)).toBe(true)
  })

  it(`should restore pre-existing custom styles`, () => {
    const table = create_table()
    const header = get_required_header(table)
    header.style.color = `blue`

    const cleanup = sortable()(table)
    header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    cleanup?.()

    expect(header.style.color).toBe(`blue`)
  })

  it.each([
    [`whitespace-only cells as empty`, [`   `, `5`, `1`], [`1`, `5`, ``]],
    [
      `mixed numeric and text cells`,
      [`foo`, `10`, `bar`, `2`],
      [`2`, `10`, `bar`, `foo`],
    ],
  ])(`should sort %s correctly`, (_desc, cells, expected) => {
    const table = document.createElement(`table`)
    const rows = cells.map((val: string) => `<tr><td>${val}</td></tr>`).join(``)
    table.innerHTML = `<thead><tr><th>Col</th></tr></thead><tbody>${rows}</tbody>`
    document.body.append(table)

    sortable()(table)
    get_required_header(table).dispatchEvent(new MouseEvent(`click`, { bubbles: true }))

    expect(get_column_values(table, 0).map((val) => val?.trim())).toEqual(expected)
  })

  it(`should treat rows with missing cells (colspan placeholder) as empty and sort them last`, () => {
    const table = document.createElement(`table`)
    table.innerHTML =
      `<thead><tr><th>Name</th><th>Score</th></tr></thead><tbody>` +
      `<tr><td colspan="2">No data</td></tr>` +
      `<tr><td>Alice</td><td>3</td></tr>` +
      `<tr><td>Bob</td><td>1</td></tr>` +
      `</tbody>`
    document.body.append(table)

    sortable()(table)
    // click 2nd column header; placeholder row has no cell at index 1
    const score_header = table.querySelectorAll(`thead th`)[1]
    score_header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))

    const first_cells = Array.from(
      table.querySelectorAll<HTMLTableRowElement>(`tbody tr`),
    ).map((row) => row.cells[0]?.textContent)
    expect(first_cells).toEqual([`Bob`, `Alice`, `No data`])
  })

  it(`should not re-parent rows of nested tables when sorting`, () => {
    const table = document.createElement(`table`)
    table.innerHTML =
      `<thead><tr><th>Name</th><th>Data</th></tr></thead><tbody>` +
      `<tr><td>Beta</td><td><table><tbody><tr><td>nested</td></tr></tbody></table></td></tr>` +
      `<tr><td>Alpha</td><td>plain</td></tr>` +
      `</tbody>`
    document.body.append(table)

    sortable()(table)
    get_required_header(table).dispatchEvent(new MouseEvent(`click`, { bubbles: true }))

    const nested_table = table.querySelector(`tbody table`)
    expect(nested_table?.querySelectorAll(`tr`)).toHaveLength(1)
    const outer_rows = Array.from(table.querySelector(`tbody`)?.children ?? []).filter(
      (child) => child.tagName === `TR`,
    )
    expect(outer_rows.map((row) => row.querySelector(`td`)?.textContent)).toEqual([
      `Alpha`,
      `Beta`,
    ])
  })

  it(`should preserve header child markup across sort clicks and cleanup`, () => {
    const table = create_table()
    const header = get_required_header(table)
    header.innerHTML = `<span class="icon">▲</span> Planet`

    const cleanup = sortable()(table)
    header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))

    expect(header.querySelector(`span.icon`)?.textContent).toBe(`▲`)
    expect(header.querySelector(`span.sort-arrow`)?.textContent).toContain(`↑`)

    // repeated clicks must not accumulate arrows
    header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(header.querySelectorAll(`span.sort-arrow`)).toHaveLength(1)
    expect(header.querySelector(`span.sort-arrow`)?.textContent).toContain(`↓`)
    expect(header.querySelector(`span.icon`)?.textContent).toBe(`▲`)

    cleanup?.()
    expect(header.innerHTML).toBe(`<span class="icon">▲</span> Planet`)
  })
})

describe(`resizable`, () => {
  const create_element = () => {
    const element = document.createElement(`div`)
    element.style.width = `200px`
    element.style.height = `150px`
    document.body.append(element)
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

  it.each([
    [`right`, undefined, 195, 75, `ew-resize`],
    [`bottom`, undefined, 100, 145, `ns-resize`],
    [`left`, [`left`], 5, 75, `ew-resize`],
    [`top`, [`top`], 100, 5, `ns-resize`],
  ] as const)(
    `should apply resize cursor on %s edge hover`,
    (_edge, edges, clientX, clientY, expected_cursor) => {
      const element = create_element()
      mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
      resizable(edges ? { edges: [...edges] } : {})(element)

      element.dispatchEvent(mouse_event(`mousemove`, clientX, clientY))

      expect(element.style.cursor).toBe(expected_cursor)
    },
  )

  it(`should reset cursor when not hovering on edge`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable()(element)

    element.dispatchEvent(mouse_event(`mousemove`, 195, 75))
    expect(element.style.cursor).toBe(`ew-resize`)

    element.dispatchEvent(mouse_event(`mousemove`, 100, 75))
    expect(element.style.cursor).toBe(``)
  })

  it.each([
    [`min_width`, { min_width: 100 }, [195, 75], [50, 75], `width`, `100px`],
    [`max_width`, { max_width: 300 }, [195, 75], [500, 75], `width`, `300px`],
    [`min_height`, { min_height: 80 }, [100, 145], [100, 30], `height`, `80px`],
    [`max_height`, { max_height: 250 }, [100, 145], [100, 400], `height`, `250px`],
  ] as const)(
    `should respect %s constraint`,
    (
      _constraint,
      options,
      [start_client_x, start_client_y],
      [drag_client_x, drag_client_y],
      dimension,
      expected_value,
    ) => {
      const element = create_element()
      mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
      resizable(options)(element)

      element.dispatchEvent(mouse_event(`mousedown`, start_client_x, start_client_y))
      globalThis.dispatchEvent(mouse_event(`mousemove`, drag_client_x, drag_client_y))

      expect(element.style[dimension]).toBe(expected_value)

      globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    },
  )

  it(`should fire on_resize_start, on_resize, and on_resize_end callbacks`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    const on_resize_start = vi.fn()
    const on_resize = vi.fn()
    const on_resize_end = vi.fn()

    resizable({ on_resize_start, on_resize, on_resize_end })(element)

    element.dispatchEvent(mouse_event(`mousedown`, 195, 75))
    expect(on_resize_start).toHaveBeenCalledTimes(1)
    expect(on_resize_start).toHaveBeenCalledWith(expect.any(MouseEvent), {
      width: 200,
      height: 150,
    })

    globalThis.dispatchEvent(mouse_event(`mousemove`, 250, 75))
    expect(on_resize).toHaveBeenCalledTimes(1)
    expect(on_resize).toHaveBeenCalledWith(expect.any(MouseEvent), {
      width: 255,
      height: 150,
    })

    // End resize
    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    expect(on_resize_end).toHaveBeenCalledTimes(1)
    expect(on_resize_end).toHaveBeenCalledWith(
      expect.any(MouseEvent),
      { width: 200, height: 150 }, // offsetWidth/Height from mock
    )
  })

  it.each([
    [
      `left`,
      { left: 100, top: 50, width: 200, height: 150 },
      [105, 100],
      [55, 100],
      { width: `250px`, left: `50px` },
    ],
    [
      `top`,
      { left: 100, top: 100, width: 200, height: 150 },
      [200, 105],
      [200, 55],
      { height: `200px`, top: `50px` },
    ],
  ] as const)(
    `should handle %s edge resize with position adjustment`,
    (
      _edge,
      rect,
      [start_client_x, start_client_y],
      [drag_client_x, drag_client_y],
      expected_styles,
    ) => {
      const element = create_element()
      mock_rect(element, rect)
      resizable({ edges: [_edge] })(element)

      element.dispatchEvent(mouse_event(`mousedown`, start_client_x, start_client_y))
      globalThis.dispatchEvent(mouse_event(`mousemove`, drag_client_x, drag_client_y))

      for (const [property, value] of Object.entries(expected_styles)) {
        expect(element.style.getPropertyValue(property)).toBe(value)
      }

      globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    },
  )

  it(`should do nothing when disabled`, () => {
    const element = create_element()
    const cleanup = resizable({ disabled: true })(element)

    expect(cleanup).toBeUndefined()
    expect(element.style.cursor).toBe(``)
  })

  it.each([
    [`width`, { min_width: 300, max_width: 100 }],
    [`height`, { min_height: 300, max_height: 100 }],
  ] as const)(`warns and skips invalid %s constraints`, (_dimension, options) => {
    const element = create_element()
    const warn = vi.spyOn(console, `warn`).mockImplementation(() => undefined)

    try {
      const cleanup = resizable(options)(element)

      expect(cleanup).toBeUndefined()
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`min dimensions exceed max dimensions`),
      )
      expect(element.style.cursor).toBe(``)
    } finally {
      warn.mockRestore()
    }
  })

  it.each([
    [`static`, `relative`],
    [`absolute`, `absolute`],
  ])(`position %s initializes as %s`, (initial_position, expected_position) => {
    const element = create_element()
    element.style.position = initial_position
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    resizable()(element)

    expect(element.style.position).toBe(expected_position)
  })

  it(`should cleanup properly and remove all event listeners`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    const cleanup = resizable()(element)

    element.dispatchEvent(mouse_event(`mousemove`, 195, 75))
    expect(element.style.cursor).toBe(`ew-resize`)

    cleanup?.()
    expect(element.style.cursor).toBe(``)
  })

  it(`should use custom handle_size`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    resizable({ handle_size: 20 })(element)

    element.dispatchEvent(mouse_event(`mousemove`, 185, 75))
    expect(element.style.cursor).toBe(`ew-resize`)

    element.dispatchEvent(mouse_event(`mousemove`, 175, 75))
    expect(element.style.cursor).toBe(``)
  })

  it(`should not start resizing when clicking outside edge areas`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    const on_resize_start = vi.fn()
    resizable({ on_resize_start })(element)

    element.dispatchEvent(mouse_event(`mousedown`, 100, 75))

    expect(on_resize_start).not.toHaveBeenCalled()
  })

  it(`should ignore mousemove when not resizing`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })
    const on_resize = vi.fn()
    resizable({ on_resize })(element)

    globalThis.dispatchEvent(mouse_event(`mousemove`, 300, 75))

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

    element.dispatchEvent(mouse_event(`mousedown`, 195, 75))
    expect(document.body.style.userSelect).toBe(`none`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    expect(document.body.style.userSelect).toBe(``)
  })

  it(`should reset body userSelect when cleaned up mid-resize`, () => {
    const element = create_element()
    mock_rect(element, { left: 0, top: 0, width: 200, height: 150 })

    const cleanup = resizable()(element)
    element.dispatchEvent(mouse_event(`mousedown`, 195, 75))
    expect(document.body.style.userSelect).toBe(`none`)

    cleanup?.() // unmount mid-resize, before any mouseup
    expect(document.body.style.userSelect).toBe(``)
  })
})
