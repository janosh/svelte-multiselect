import type {
  ContrastOptions,
  FocusTrapOptions,
  ResizableOptions,
} from '$lib/attachments'
import {
  click_outside,
  contrast_color,
  dismiss_on_outside_press,
  draggable,
  float,
  focus_trap,
  forward_window_keydown,
  get_bg_color,
  get_html_sort_value,
  highlight_matches,
  hotkey,
  pick_contrast_color,
  portal,
  resizable,
  sortable,
  tooltip,
} from '$lib/attachments'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { doc_query, mock_rect, pointer_event, stub_prop } from './index'

const create_element = (tag = `div`, styles: Partial<CSSStyleDeclaration> = {}) => {
  const element = document.createElement(tag)
  Object.assign(element.style, styles)
  document.body.append(element)
  return element
}

describe(`get_html_sort_value`, () => {
  const add_data_sort = (element: HTMLElement, value: string) =>
    element.setAttribute(`data-sort-value`, value)
  const add_text = (element: HTMLElement, text: string) => (element.textContent = text)

  it.each([
    [`data-sort-value wins over text`, `custom-value`, `Different text`, `custom-value`],
    [`an empty data-sort-value stays empty`, ``, `Some text`, ``],
    [`textContent when no data-sort-value`, null, `Element text`, `Element text`],
    [`an empty element`, null, null, ``],
    [`whitespace textContent verbatim`, null, `   \n\t   `, `   \n\t   `],
  ])(`%s`, (_desc, data_sort_value, text_content, expected) => {
    const element = create_element()
    if (data_sort_value !== null) add_data_sort(element, data_sort_value)
    if (text_content !== null) add_text(element, text_content)
    expect(get_html_sort_value(element)).toBe(expected)
  })

  it(`returns the first descendant data-sort-value recursively`, () => {
    const [parent, child, grandchild, sibling] = [
      create_element(),
      create_element(`span`),
      create_element(`em`),
      create_element(`span`),
    ]
    add_text(parent, `Parent text`)
    add_text(child, `Child text`)
    add_data_sort(grandchild, `grandchild-value`)
    add_data_sort(sibling, `sibling-value`)
    add_text(grandchild, `Grandchild text`)
    child.append(grandchild)
    parent.append(child, sibling)
    expect(get_html_sort_value(parent)).toBe(`grandchild-value`)
  })
})

// The mocks below swap prototype getters and put the originals back. A happy-dom that
// moved one off HTMLElement.prototype must fail here rather than leave a patched
// prototype behind for every later test — getBoundingClientRect already has no own
// descriptor there, so this is not hypothetical.
const own_prototype_descriptor = (prop: string): PropertyDescriptor => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)
  if (!descriptor) throw new Error(`HTMLElement.prototype.${prop} is not an own property`)
  return descriptor
}

describe(`tooltip`, () => {
  const setup_tooltip = (element: HTMLElement, options = {}) => tooltip(options)(element)

  const mock_bounds = (
    element: HTMLElement,
    bounds = { left: 100, top: 100, width: 50, height: 50 },
  ) => mock_rect(element, bounds)

  const mock_viewport = (width: number, height: number) => {
    const set_size = (inner_width: number, inner_height: number) => {
      const sizes = { innerWidth: inner_width, innerHeight: inner_height }
      for (const [prop, value] of Object.entries(sizes)) {
        Object.defineProperty(globalThis, prop, { configurable: true, value })
      }
    }
    const [original_width, original_height] = [
      globalThis.innerWidth,
      globalThis.innerHeight,
    ]
    set_size(width, height)
    return () => set_size(original_width, original_height)
  }

  // Only `.custom-tooltip` elements report the mocked size; everything else keeps
  // its real (zero) geometry so trigger bounds stay under mock_bounds' control.
  const mock_tooltip_size = (width: number, height: number) => {
    const is_tooltip = (node: HTMLElement) => node.classList.contains(`custom-tooltip`)
    const bounds_spy = vi
      .spyOn(HTMLElement.prototype, `getBoundingClientRect`)
      .mockImplementation(function (this: HTMLElement) {
        const [box_width, box_height] = is_tooltip(this) ? [width, height] : [0, 0]
        return {
          left: 0,
          top: 0,
          width: box_width,
          height: box_height,
          right: box_width,
          bottom: box_height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })

    const originals = (
      [
        [`offsetWidth`, width],
        [`offsetHeight`, height],
      ] as const
    ).map(([prop, size]) => {
      const original = own_prototype_descriptor(prop)
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get(this: HTMLElement) {
          return is_tooltip(this) ? size : (original.get?.call(this) ?? 0)
        },
      })
      return [prop, original] as const
    })

    return () => {
      bounds_spy.mockRestore()
      for (const [prop, original] of originals) {
        Object.defineProperty(HTMLElement.prototype, prop, original)
      }
    }
  }

  // happy-dom does no layout, so the width balancer's binary search has nothing to
  // bisect: every measurement returns the same number and it takes the min-content
  // escape hatch instead. This stands in a box that really wraps — its height is the
  // number of lines the text needs at the current width — and reports the padding and
  // box-sizing the balancer reads, which happy-dom leaves empty (and so NaN).
  const mock_wrapping_tooltip = ({
    single_line,
    min_content,
    line_height,
    max_width,
  }: {
    single_line: number
    min_content: number
    line_height: number
    max_width: number
  }) => {
    const is_tooltip = (node: HTMLElement) => node.classList.contains(`custom-tooltip`)
    const laid_out_width = ({ style }: HTMLElement) => {
      if (style.width === `min-content`) return min_content
      const explicit = Number(style.width.replace(/px$/u, ``))
      if (Number.isFinite(explicit) && style.width !== ``) return explicit
      // `auto`: a single line while wrapping is off, else as wide as the cap allows
      if (style.whiteSpace === `nowrap`) return single_line
      return Math.min(single_line, style.maxWidth === `none` ? Infinity : max_width)
    }

    const undo_metrics = ([`offsetWidth`, `offsetHeight`] as const).map((prop) => {
      const original = own_prototype_descriptor(prop)
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get(this: HTMLElement) {
          if (!is_tooltip(this)) return original.get?.call(this) ?? 0
          const width = laid_out_width(this)
          if (prop === `offsetWidth`) return width
          return Math.ceil(single_line / width) * line_height
        },
      })
      return () => Object.defineProperty(HTMLElement.prototype, prop, original)
    })

    const real_computed = globalThis.getComputedStyle.bind(globalThis)
    const computed_spy = vi
      .spyOn(globalThis, `getComputedStyle`)
      .mockImplementation((node, pseudo) => {
        const computed = real_computed(node, pseudo)
        if (!(node instanceof HTMLElement) || !is_tooltip(node)) return computed
        // border-box keeps style.width and offsetWidth the same number, so the search
        // reads back exactly what it wrote
        const overrides: Record<string, string> = {
          boxSizing: `border-box`,
          maxWidth: `${max_width}px`,
        }
        return new Proxy(computed, {
          get: (target, key) => {
            if (typeof key === `string` && key in overrides) return overrides[key]
            const value = Reflect.get(target, key)
            // CSSStyleDeclaration methods use private fields, so they reject the proxy
            // as a receiver unless handed back already bound to the real declaration
            return typeof value === `function` ? value.bind(target) : value
          },
        })
      })

    return () => {
      computed_spy.mockRestore()
      for (const undo of undo_metrics) undo()
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

  // Arrow fill borders: the solid, non-transparent ones carry the background color
  const arrow_border_values = (set_prop_values: string[]) =>
    set_prop_values.filter(
      (entry) =>
        entry.startsWith(`border-`) &&
        entry.includes(`solid`) &&
        !entry.includes(`transparent`),
    )

  // Shared helper for triggering tooltip display (requires vi.useFakeTimers())
  const trigger_tooltip = (element: HTMLElement) => {
    element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
    vi.runAllTimers()
  }

  // Creates a trigger with the given title (default bounds: left/top 100, 50x50)
  // and attaches a tooltip to it, returning the trigger and the attachment cleanup
  const attach_tooltip = (title = `test`, options: Record<string, unknown> = {}) => {
    const element = create_element()
    element.title = title
    mock_bounds(element)
    return [element, setup_tooltip(element, { delay: 0, ...options })] as const
  }

  // Same, but also hovers the trigger so its tooltip becomes visible
  const show_tooltip = (options: Record<string, unknown> = {}, title = `test`) => {
    const [element] = attach_tooltip(title, options)
    trigger_tooltip(element)
    return element
  }

  // Shows a tooltip with style writes captured, restoring the prototype patches
  // even if showing throws. Returns the captured cssText/setProperty values.
  const show_with_captured_styles = (
    customize: (element: HTMLElement) => void = () => {},
    options: Record<string, unknown> = {},
  ) => {
    const { css_texts, set_prop_values, restore } = capture_style_writes()
    try {
      const element = create_element()
      element.title = `styled tooltip`
      customize(element)
      mock_bounds(element)
      setup_tooltip(element, { delay: 0, ...options })
      trigger_tooltip(element)
    } finally {
      restore()
    }
    return { css_texts, set_prop_values }
  }

  describe(`Content Sources`, () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it.each([
      [`title`, `title`, `Title tooltip`, true],
      [`custom content`, `content`, `Custom content`, false],
      [`aria-label`, `aria-label`, `Aria label tooltip`, false],
      [`data-title`, `data-title`, `Data title tooltip`, false],
    ])(`creates a tooltip from %s`, (_desc, attr, content, stores_title) => {
      const element = create_element()
      const options = attr === `content` ? { content, delay: 0 } : { delay: 0 }
      if (attr !== `content`) element.setAttribute(attr, content)
      mock_bounds(element)

      const cleanup = setup_tooltip(element, options)

      expect(cleanup).toBeTypeOf(`function`)
      expect(element.hasAttribute(`data-original-title`)).toBe(stores_title)
      if (stores_title) expect(element.getAttribute(`data-original-title`)).toBe(content)
      if (attr !== `content`) {
        expect(element.getAttribute(attr)).toBe(stores_title ? null : content)
      }

      // the attachment must actually render this content source on hover
      trigger_tooltip(element)
      expect(document.querySelectorAll(`.custom-tooltip`)).toHaveLength(1)
      expect(doc_query(`.tooltip-content`).textContent).toBe(content)

      cleanup?.()
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })

    it.each([
      [`custom content over title`, { content: `Custom content` }, `Custom content`],
      [`title over aria-label`, {}, `Title content`],
    ])(`prioritizes %s`, (_description, options, expected_content) => {
      const element = create_element()
      element.title = `Title content`
      element.setAttribute(`aria-label`, `Aria content`)
      mock_bounds(element)
      setup_tooltip(element, { ...options, delay: 0 })
      trigger_tooltip(element)

      expect(element.getAttribute(`data-original-title`)).toBe(`Title content`)
      expect(element.hasAttribute(`title`)).toBe(false)
      expect(doc_query(`.tooltip-content`).textContent).toBe(expected_content)
    })

    it.each([
      [`empty content strings`, ``, undefined],
      [`missing content`, undefined, undefined],
    ])(`handles %s`, (_desc, content, expected) => {
      const element = create_element()
      if (content !== undefined) element.title = content
      mock_bounds(element)
      expect(tooltip({ content })(element)).toBe(expected)

      // no content means no listeners should have been attached either
      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })

    it(`handles the disabled option`, () => {
      const [element, cleanup] = attach_tooltip(`Disabled tooltip`, { disabled: true })
      expect(cleanup).toBeUndefined()
      expect(element.hasAttribute(`data-original-title`)).toBe(false)
      expect(element.getAttribute(`title`)).toBe(`Disabled tooltip`)

      trigger_tooltip(element)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })
  })

  describe(`Child Element Handling`, () => {
    it.each([
      [`title`, `title`, `Child title tooltip`],
      [`aria-label`, `aria-label`, `Child aria tooltip`],
      [`data-title`, `data-title`, `Child data tooltip`],
    ])(`sets up tooltips for child elements with %s`, (_desc, attr, content) => {
      const parent = create_element()
      const wrapper = document.createElement(`div`)
      const child = document.createElement(`span`)
      child.setAttribute(attr, content)
      wrapper.append(child)
      parent.append(wrapper)
      const cleanup = setup_tooltip(parent)

      expect(cleanup).toBeTypeOf(`function`)
      if (attr === `title`) {
        expect(child.hasAttribute(`title`)).toBe(false)
        expect(child.getAttribute(`data-original-title`)).toBe(content)
      } else expect(child.getAttribute(attr)).toBe(content)
      cleanup?.()
    })

    it(`does not set up children added after initialization`, async () => {
      const parent = create_element()
      parent.title = `Parent tooltip` // keep the attachment live, else nothing is observed
      const cleanup = setup_tooltip(parent)
      expect(cleanup).toBeTypeOf(`function`)
      expect(parent.getAttribute(`data-original-title`)).toBe(`Parent tooltip`)

      const child = document.createElement(`div`)
      child.title = `Dynamic`
      parent.append(child)
      await Promise.resolve() // flush MutationObserver microtask

      expect(child.hasAttribute(`data-original-title`)).toBe(false)
      expect(child.getAttribute(`title`)).toBe(`Dynamic`)
      cleanup?.()
    })
  })

  describe(`Event Handling and Cleanup`, () => {
    it(`handles an invalid element gracefully`, () => {
      const attach = tooltip()
      // @ts-expect-error testing a null input
      expect(attach(null)).toBeUndefined()
    })

    it(`restores the original title on cleanup`, () => {
      const element = create_element()
      element.title = `Original title`
      const cleanup = setup_tooltip(element)

      expect(element.hasAttribute(`title`)).toBe(false)
      expect(element.getAttribute(`data-original-title`)).toBe(`Original title`)

      cleanup?.()
      expect(element.getAttribute(`title`)).toBe(`Original title`)
      expect(element.hasAttribute(`data-original-title`)).toBe(false)
    })

    it(`removes the scroll listener on cleanup`, () => {
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

  describe(`Reactive Content and Scroll Behavior`, () => {
    // MutationObserver callbacks don't fire in happy-dom, so we test setup/cleanup/ownership.
    beforeEach(() => vi.useFakeTimers())

    it(`hides on ancestor scroll but ignores unrelated scroll`, () => {
      const ancestor = document.createElement(`div`)
      const element = create_element()
      ancestor.append(element)
      document.body.append(ancestor)
      element.title = `test`
      mock_bounds(element)
      setup_tooltip(element, { delay: 0 })
      trigger_tooltip(element)

      const unrelated_scroll = new Event(`scroll`, { bubbles: true })
      Object.defineProperty(unrelated_scroll, `target`, {
        value: document.createElement(`div`),
      })
      globalThis.dispatchEvent(unrelated_scroll)
      expect(document.querySelector(`.custom-tooltip`)).toBeInstanceOf(HTMLDivElement)

      const scroll_event = new Event(`scroll`, { bubbles: true })
      Object.defineProperty(scroll_event, `target`, { value: ancestor })
      globalThis.dispatchEvent(scroll_event)

      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
      ancestor.remove()
    })

    it(`shows only one tooltip at a time`, () => {
      show_tooltip({}, `tooltip1`)
      show_tooltip({}, `tooltip2`)

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
      expect(doc_query(`.custom-tooltip`).textContent).toContain(`focus tooltip`)

      element.dispatchEvent(new FocusEvent(`blur`, { bubbles: true }))
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })
  })

  describe(`Cross-Instance Cleanup`, () => {
    beforeEach(() => vi.useFakeTimers())

    it(`cleanup of one instance keeps another instance's visible tooltip`, () => {
      const [, cleanup_a] = attach_tooltip(`tooltip A`)
      const el_b = show_tooltip({}, `tooltip B`)
      expect(doc_query(`.custom-tooltip`).textContent).toContain(`tooltip B`)

      cleanup_a?.()
      expect(doc_query(`.custom-tooltip`).textContent).toContain(`tooltip B`)
      expect(el_b.getAttribute(`aria-describedby`)).toBe(doc_query(`.custom-tooltip`).id)
    })

    it(`cleanup of one instance keeps another instance's pending show`, () => {
      const [, cleanup_a] = attach_tooltip(`tooltip A`, { delay: 100 })
      const [el_b] = attach_tooltip(`tooltip B`, { delay: 100 })

      el_b.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      cleanup_a?.() // must not cancel B's pending show timeout

      vi.runAllTimers()
      expect(doc_query(`.custom-tooltip`).textContent).toContain(`tooltip B`)
    })

    it(`cleanup cancels its own pending show`, () => {
      const [element, cleanup] = attach_tooltip(`own pending`, { delay: 100 })

      element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      cleanup?.()

      vi.runAllTimers()
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })

    it(`removing the element from the DOM cancels its pending show`, async () => {
      const [element] = attach_tooltip(`pending on removed element`, { delay: 100 })

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

  describe(`Placement, Styling and Content`, () => {
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
        // Arrow points away from trigger: the side opposite the placement carries
        // the negative offset, the placement side itself stays unset
        const opposite_side: Record<string, string> = {
          top: `bottom`,
          bottom: `top`,
          left: `right`,
          right: `left`,
        }

        with_mocked_tooltip_geometry(viewport, tooltip_size, () => {
          const element = create_element()
          element.title = `test`
          mock_bounds(element, trigger_bounds)
          setup_tooltip(element, { delay: 0, placement: requested_placement ?? `bottom` })

          trigger_tooltip(element)
          const tooltip_el = doc_query(`.custom-tooltip`)
          expect(tooltip_el.getAttribute(`data-placement`)).toBe(expected_placement)
          const { style } = doc_query(`.custom-tooltip-arrow`)

          // exact value: the perpendicular axis holds `calc(50% - 6px)`, so a
          // substring check for `-` would also pass on swapped axes
          expect(style.getPropertyValue(opposite_side[expected_placement])).toBe(`-6px`)
          expect(style.getPropertyValue(expected_placement)).toBe(``)
        })
      },
    )

    it.each([
      [`hide_delay: 200 delays hiding`, { hide_delay: 200 }, true, 200],
      [`undefined hide_delay hides immediately`, {}, false, 0],
    ])(`%s`, (_desc, options, visible_after_leave, delay_ms) => {
      const element = show_tooltip(options)
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
      const [element] = attach_tooltip(`delayed tooltip`, { delay: 100 })

      element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      vi.advanceTimersByTime(99)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()

      element.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
      vi.advanceTimersByTime(1)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
    })

    it(`disabled: 'touch-devices' skips tooltip on touch input`, () => {
      // With runtime detection, tooltip is set up but skipped when last pointer was touch
      const [element, cleanup] = attach_tooltip(`test`, { disabled: `touch-devices` })

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
      show_tooltip()
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
      show_tooltip(options)

      const arrow = doc_query(`.custom-tooltip`).querySelector(`.custom-tooltip-arrow`)
      expect(arrow).toEqual(expect_arrow ? expect.any(HTMLDivElement) : null)
    })

    it(`manages aria-describedby on show/hide`, () => {
      const [element] = attach_tooltip()
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
      [`default offset: 12`, undefined, 162], // top (100) + height (50) + default (12) = 162
    ])(`applies %s`, (_desc, offset, expected_top) => {
      show_tooltip({ offset, placement: `bottom` })
      expect(doc_query(`.custom-tooltip`).style.top).toBe(`${expected_top}px`)
    })

    it.each([
      [`called and strips XSS`, true, `<script>xss</script>Safe`, 1, `Safe`],
      [`skipped when allow_html: false`, false, `Plain`, 0, `Plain`],
    ])(`sanitize_html %s`, (_desc, allow_html, title, call_count, expected_text) => {
      const sanitizer = vi.fn((html: string) =>
        html.replaceAll(/<script[^>]*>.*?<\/script>/giu, ``),
      )
      show_tooltip({ allow_html, sanitize_html: sanitizer }, title)

      expect(sanitizer).toHaveBeenCalledTimes(call_count)
      expect(doc_query(`.custom-tooltip`).textContent).toBe(expected_text)
    })

    it.each([
      // short enough for one line, so the balancer pins that width and stops wrapping
      [`pins a one-line tooltip to its own text width`, 150, `150px`, `nowrap`],
      // 600px of text capped at 280 wraps onto 3 lines, and 200px is the narrowest box
      // that still holds 3 — wider wastes space, a pixel less spills onto a 4th
      [
        `balances a wrapped tooltip to the narrowest width holding its lines`,
        600,
        `200px`,
        ``,
      ],
    ])(`%s`, (_desc, single_line, expected_width, expected_wrap) => {
      const restore = mock_wrapping_tooltip({
        single_line,
        min_content: 100,
        line_height: 20,
        max_width: 280,
      })
      try {
        show_tooltip({}, `a tooltip long enough to wrap onto several lines`)
        const tip = doc_query(`.custom-tooltip`)
        expect(tip.style.width).toBe(expected_width)
        // happy-dom reports an unset textWrap as undefined rather than an empty string
        expect(tip.style.textWrap || ``).toBe(expected_wrap)
      } finally {
        restore()
      }
    })

    it(`tooltip uses theme-aware light-dark() defaults`, () => {
      // Base styles must not carry a color-scheme (page-declared schemes stay in
      // control, see #405); the schemeless-page fallback is covered below. Asserts
      // via raw cssText/setProperty spies because happy-dom strips var()/light-dark().
      const { css_texts, set_prop_values } = show_with_captured_styles()

      const tooltip_css = find_tooltip_css(css_texts)
      expect(tooltip_css).toBeDefined()
      expect(tooltip_css).not.toContain(`color-scheme`)
      expect(tooltip_css).toMatch(/background-color:.*light-dark\(\s*#fff,\s*#2a2a2e/u)
      expect(tooltip_css).toMatch(/\bcolor:.*light-dark\(\s*#222,\s*#eee/u)
      expect(tooltip_css).toMatch(
        /border:.*var\(--tooltip-border,\s*1px solid light-dark\(\s*lightgray,\s*#555\)/u,
      )

      const arrow_borders = arrow_border_values(set_prop_values)
      expect(arrow_borders.length).toBeGreaterThan(0)
      for (const entry of arrow_borders) {
        expect(entry).toMatch(/light-dark\(\s*#fff,\s*#2a2a2e/u)
      }
    })

    it.each([
      [`background`, `--tooltip-bg`, `red`],
      [`border`, `--tooltip-border`, `2px solid red`],
    ])(`custom %s variable overrides its default`, (_description, css_var, value) => {
      const { css_texts } = show_with_captured_styles((element) =>
        element.style.setProperty(css_var, value),
      )

      expect(doc_query(`.custom-tooltip`).style.getPropertyValue(css_var)).toBe(value)
      expect(find_tooltip_css(css_texts)).toContain(`var(${css_var},`)
    })

    // Dark-styled pages that never declare `color-scheme` resolve the default
    // light-dark() background to LIGHT while their inherited --text-color may be
    // near-white → unreadable tooltip. The fallback pairs scheme + text color, and
    // only a page-level (body-inherited) scheme may suppress it — a scheme on the
    // trigger never reaches the tooltip, which is appended to document.body.
    it.each([
      [`page declares no scheme`, () => {}, true],
      [
        `only the trigger has a color-scheme`,
        (element: HTMLElement) => (element.style.colorScheme = `dark`),
        true,
      ],
      [
        `page declares a color-scheme`,
        () => (document.body.style.colorScheme = `dark`),
        false,
      ],
      [
        `trigger customizes --tooltip-bg`,
        (element: HTMLElement) => element.style.setProperty(`--tooltip-bg`, `red`),
        false,
      ],
      [
        `trigger carries its own --text-color`,
        (element: HTMLElement) => element.style.setProperty(`--text-color`, `#0ff`),
        false,
      ],
    ])(`scheme fallback when %s`, (_desc, customize, expect_fallback) => {
      const { set_prop_values } = show_with_captured_styles(customize)
      document.body.style.colorScheme = ``

      // anchors the negative cases: no tooltip would satisfy them trivially
      expect(document.querySelectorAll(`.custom-tooltip`)).toHaveLength(1)
      const fallback_props = [
        `color-scheme: light dark`,
        `--text-color: light-dark(#222, #eee)`,
      ]
      expect(fallback_props.filter((prop) => set_prop_values.includes(prop))).toEqual(
        expect_fallback ? fallback_props : [],
      )
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

      const restore_size = mock_tooltip_size(120, 60)
      const restore_viewport = mock_viewport(300, 180) // no room below the trigger
      try {
        const element = create_element()
        element.title = `initial tooltip`
        mock_bounds(element, { left: 100, top: 120, width: 40, height: 20 })
        setup_tooltip(element, { delay: 0, placement: `bottom` })
        trigger_tooltip(element)
        expect(doc_query(`.tooltip-content`).textContent).toBe(`initial tooltip`)
        expect(doc_query(`.custom-tooltip`).getAttribute(`data-placement`)).toBe(`top`)

        // both sides fit again; the first restore still holds the real viewport
        mock_viewport(300, 300)
        element.setAttribute(`aria-label`, `updated tooltip`)
        // only the fields the attachment reads; the rest of MutationRecord is unused
        const record = {
          type: `attributes`,
          attributeName: `aria-label`,
          target: element,
        } as unknown as MutationRecord
        mutation_callbacks[0]?.([record], new MockMutationObserver(() => {}))
        vi.runAllTimers() // flush the rAF the reposition runs in

        expect(doc_query(`.tooltip-content`).textContent).toBe(`updated tooltip`)
        // reposition starts from the configured side again; reading back the resolved
        // data-placement would have pinned it to `top` for the rest of its life
        expect(doc_query(`.custom-tooltip`).getAttribute(`data-placement`)).toBe(`bottom`)
      } finally {
        restore_viewport()
        restore_size()
        globalThis.MutationObserver = original_mutation_observer
        window.MutationObserver = original_mutation_observer
      }
    })

    it(`applies valid custom style declarations and ignores malformed ones`, () => {
      show_tooltip({
        style: `background-color: red; background-image: url("https://example.com/tooltip.svg"); color: blue; invalid; empty:`,
      })

      const { style } = doc_query(`.custom-tooltip`)
      expect(style.backgroundColor).toBe(`red`)
      expect(style.backgroundImage).toContain(`https://example.com/tooltip.svg`)
      expect(style.color).toBe(`blue`)
      expect(style.getPropertyValue(`invalid`)).toBe(``)
      expect(style.getPropertyValue(`empty`)).toBe(``)
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
      const { set_prop_values } = show_with_captured_styles(undefined, {
        style: `background-color: red`,
      })

      expect(
        arrow_border_values(set_prop_values).some((entry) =>
          /\b(?:red|rgb\(255,\s*0,\s*0\))/u.test(entry),
        ),
      ).toBe(true)
    })
  })
})

describe(`click_outside`, () => {
  const dispatch_press = (
    target: Element,
    path: EventTarget[] = [],
    kind = `pointerdown`,
    init: PointerEventInit = {},
  ) => {
    // a real PointerEvent so the scrollbar guard (MouseEvent-only) actually runs here, and
    // primary by default because the constructor's own default reads as a second finger
    const event = kind.startsWith(`pointer`)
      ? new PointerEvent(kind, { bubbles: true, isPrimary: true, ...init })
      : new Event(kind, { bubbles: true })
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

  // returns the event so callers can assert on identity or defaultPrevented
  const press_escape = (init: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent(`keydown`, {
      key: `Escape`,
      bubbles: true,
      cancelable: true,
      ...init,
    })
    document.dispatchEvent(event)
    return event
  }

  // document.body.innerHTML = '' leaves click_outside's document capture listeners
  // and Escape layers behind, which would decide later tests' assertions
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })

  // attaches click_outside to a fresh element wired to a spy callback
  const attach_outside = (config: Parameters<typeof click_outside>[0] = {}) => {
    const element = create_element()
    const callback = vi.fn()
    const cleanup = click_outside({ callback, ...config })(element)
    if (cleanup) cleanups.push(cleanup)
    return { element, callback, cleanup }
  }

  it.each([
    [`inside click`, false, true, 0],
    [`disabled`, true, false, 0],
  ])(`%s triggers callback %s times`, (_desc, is_outside, enabled, expected_calls) => {
    const { element, callback } = attach_outside({ enabled })

    const target = is_outside ? create_element() : element
    const path = is_outside
      ? []
      : [element, document.body, document.documentElement, document, globalThis]
    dispatch_press(target, path)

    expect(callback).toHaveBeenCalledTimes(expected_calls)
  })

  it(`inside selectors keep matching regions from dismissing (single, multiple, nested)`, () => {
    const [modal, popover, nested] = [
      create_element(),
      create_element(),
      create_element(),
    ]
    modal.className = `modal`
    popover.className = `popover`
    modal.append(nested)

    const { callback } = attach_outside({ inside: [`.modal`, `.popover`] })

    dispatch_press(modal)
    dispatch_press(popover)
    dispatch_press(nested)
    expect(callback).not.toHaveBeenCalled()

    // control: proves the silence above is the inside list, not a dead listener
    dispatch_press(create_element())
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it(`triggers on clicks landing on SVG elements outside the node`, () => {
    const { callback } = attach_outside()

    const svg = document.createElementNS(`http://www.w3.org/2000/svg`, `svg`)
    document.body.append(svg)
    dispatch_press(svg)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it(`dispatches a custom event without a callback`, () => {
    const element = create_element()
    const listener = vi.fn()
    element.addEventListener(`dismiss`, listener)
    const cleanup = click_outside({})(element) // no callback
    if (cleanup) cleanups.push(cleanup)
    dispatch_press(create_element())
    expect(listener).toHaveBeenCalled()
  })

  it(`cleanup stops triggering callbacks`, () => {
    const { callback, cleanup } = attach_outside()

    dispatch_press(create_element())
    expect(callback).toHaveBeenCalledTimes(1)

    cleanup?.()
    dispatch_press(create_element())
    expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
  })

  it(`dismisses on the press, not on a following click`, () => {
    const { callback } = attach_outside()

    const outside = create_element()
    const event = dispatch_press(outside)
    expect(callback).toHaveBeenCalledTimes(1)
    // the press comes along so consumers can forward it to their own onclose
    expect(callback.mock.calls[0][2]).toEqual({
      focus_inside: false,
      via: `pointer`,
      event,
    })

    // right-clicks and OS-captured drags never send this click, hence pointerdown
    outside.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(callback).toHaveBeenCalledTimes(1)
  })

  // Same selector, another instance's trigger: it must not shield this surface. The
  // function form is resolved per press, for a `bind:this` still null at setup — a
  // plain `scope` prop would have been captured null forever.
  it.each([`element`, `function`] as const)(
    `scope as %s confines inside selectors to one subtree`,
    (kind) => {
      const [own_scope, own_trigger, other_trigger] = [
        create_element(),
        create_element(),
        create_element(),
      ]
      own_trigger.className = `trigger`
      other_trigger.className = `trigger`
      own_scope.append(own_trigger)

      let scope_el: Element | null = kind === `element` ? own_scope : null
      const { callback } = attach_outside({
        inside: [`.trigger`],
        scope: kind === `element` ? own_scope : () => scope_el,
      })

      if (kind === `function`) {
        // unconstrained while null, so the selector still shields every match
        dispatch_press(other_trigger)
        expect(callback).not.toHaveBeenCalled()
        scope_el = own_scope
      }

      dispatch_press(own_trigger)
      expect(callback).not.toHaveBeenCalled()
      dispatch_press(other_trigger)
      expect(callback).toHaveBeenCalledTimes(1)
    },
  )

  it(`an element in inside counts as part of the surface`, () => {
    const portalled = create_element() // sibling in body, no longer a descendant
    const nested = document.createElement(`button`)
    portalled.append(nested)

    // null entries are the norm: the portal target binds after the first render
    const { callback } = attach_outside({ inside: [null, portalled] })

    dispatch_press(portalled)
    dispatch_press(nested)
    expect(callback).not.toHaveBeenCalled()

    dispatch_press(create_element())
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it(`escape dismisses only the innermost layer`, () => {
    const outer = attach_outside({ escape: true })
    const inner = attach_outside({ escape: true })

    press_escape()
    expect(inner.callback).toHaveBeenCalledTimes(1)
    expect(outer.callback).not.toHaveBeenCalled()

    // with the inner surface gone, the next Escape reaches the one behind it
    inner.cleanup?.()
    press_escape()
    expect(inner.callback).toHaveBeenCalledTimes(1)
    expect(outer.callback).toHaveBeenCalledTimes(1)
    outer.cleanup?.()
  })

  it(`escape stops at the top layer instead of reaching page handlers`, () => {
    const page_handler = vi.fn()
    document.addEventListener(`keydown`, page_handler)
    const { cleanup } = attach_outside({ escape: true })

    const event = press_escape()

    expect(page_handler).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true) // a native <dialog> stays open

    cleanup?.()
    press_escape()
    expect(page_handler).toHaveBeenCalledTimes(1)
    document.removeEventListener(`keydown`, page_handler)
  })

  it(`ignores a press on the page scrollbar`, () => {
    const { callback } = attach_outside()

    // no layout in the test DOM, so give the root a client box the gutter sits outside of
    const root = document.documentElement
    cleanups.push(
      stub_prop(root, `clientWidth`, 800),
      stub_prop(root, `clientHeight`, 600),
    )
    const press = (clientX: number, clientY: number) =>
      document.body.dispatchEvent(
        new PointerEvent(`pointerdown`, { bubbles: true, clientX, clientY }),
      )

    press(820, 300) // vertical scrollbar gutter
    press(400, 620) // horizontal scrollbar gutter
    expect(callback).not.toHaveBeenCalled()

    press(400, 300) // control: same target inside the client box does dismiss
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it(`ignores Escape that is only ending an IME composition`, () => {
    const { callback, cleanup } = attach_outside({ escape: true })

    press_escape({ isComposing: true })
    expect(callback).not.toHaveBeenCalled()

    press_escape()
    expect(callback).toHaveBeenCalledTimes(1)
    cleanup?.()
  })

  it(`tolerates an empty inside selector instead of throwing on every press`, () => {
    // a trailing empty entry makes the joined selector invalid, which would throw
    // out of the capture listener for every press anywhere on the page
    const { callback, cleanup } = attach_outside({ inside: [`.modal`, ``] })

    expect(() => dispatch_press(create_element())).not.toThrow()
    expect(callback).toHaveBeenCalledTimes(1)
    cleanup?.()
  })

  it.each([true, false])(`escape reports focus_inside=%s`, (focus_inside) => {
    const { element, callback, cleanup } = attach_outside({ escape: true })
    const inner = create_element()
    element.append(inner)
    const focus_target = focus_inside ? inner : create_element()
    focus_target.setAttribute(`tabindex`, `0`)
    focus_target.focus()

    const event = press_escape()

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][2]).toEqual({ focus_inside, via: `escape`, event })
    cleanup?.()
  })

  // A surface living inside a shadow tree: document.activeElement reports the host,
  // which the surface does not contain, so only descending the chain finds the focus
  it(`escape sees focus on a node that shares the surface's shadow tree`, () => {
    const host = create_element()
    const surface = document.createElement(`div`)
    const inner = document.createElement(`button`)
    surface.append(inner)
    host.attachShadow({ mode: `open` }).append(surface)
    inner.focus()

    const callback = vi.fn()
    const cleanup = click_outside({ callback, escape: true })(surface)
    if (cleanup) cleanups.push(cleanup)
    const event = press_escape()

    expect(callback.mock.calls[0][2]).toEqual({
      focus_inside: true,
      via: `escape`,
      event,
    })
  })

  // A surface over a pannable plot or a 3D viewport wants release semantics:
  // pressing to start a drag behind it should not make it vanish under the cursor.
  it(`dismiss_on: 'release' waits for the click and ignores the press`, () => {
    const { callback } = attach_outside({ dismiss_on: `release` })

    dispatch_press(create_element())
    expect(callback).not.toHaveBeenCalled()

    dispatch_press(create_element(), [], `click`)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  // Dragging or resizing the surface can release past its edge, and the browser then
  // reports the click on a common ancestor — outside. Only a gesture that both starts
  // and ends outside is a dismissal, else a resize would close what it was resizing.
  it(`dismiss_on: 'release' ignores a gesture that started inside`, () => {
    const { element, callback } = attach_outside({ dismiss_on: `release` })

    dispatch_press(element)
    dispatch_press(create_element(), [], `click`)
    expect(callback).not.toHaveBeenCalled()

    // Enter on an outside control fires a click with no pointerdown of its own, so the
    // verdict on the drag above must not linger and swallow it
    dispatch_press(create_element(), [], `click`)
    expect(callback).toHaveBeenCalledTimes(1)

    // the OS claiming a gesture ends it without a click, so that verdict must not linger
    // for the next click either
    dispatch_press(element)
    dispatch_press(element, [], `pointercancel`)
    dispatch_press(create_element(), [], `click`)
    expect(callback).toHaveBeenCalledTimes(2)

    // nor may a right-click inside, which fires no click of its own at all
    dispatch_press(element, [], `pointerdown`, { button: 2 })
    dispatch_press(create_element(), [], `click`)
    expect(callback).toHaveBeenCalledTimes(3)
  })

  // Capture phase is what makes dismissal unsuppressable, and its price is running before
  // the pressed control's own handler — which is why a control that toggles the surface
  // belongs in `inside` rather than relying on `release` to order things for it.
  it(`dismisses from the capture phase, ahead of the pressed control's handler`, () => {
    const order: string[] = []
    const { callback } = attach_outside({ dismiss_on: `release` })
    callback.mockImplementation(() => order.push(`dismiss`))
    const control = create_element(`button`)
    control.addEventListener(`click`, (event) => {
      event.stopPropagation() // cannot suppress a dismissal that already ran
      order.push(`control`)
    })

    control.dispatchEvent(new PointerEvent(`click`, { bubbles: true }))
    expect(order).toEqual([`dismiss`, `control`])
  })

  it(`ignores Escape unless asked, so existing keydown chains keep their order`, () => {
    const { callback } = attach_outside()

    press_escape()
    expect(callback).not.toHaveBeenCalled()
  })
})

describe(`dismiss_on_outside_press`, () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })

  const press = (target: Element) =>
    target.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true }))

  const listen = (options: Parameters<typeof dismiss_on_outside_press>[0] = {}) => {
    const callback = vi.fn()
    const cleanup = dismiss_on_outside_press({ callback, ...options })
    cleanups.push(cleanup)
    return { callback, cleanup }
  }

  // One listener over several disjoint menus in a panel, which is exactly what the
  // attachment cannot express: a wrapper around them all would count every press
  // between them as inside.
  it(`without a node, inside alone decides membership`, () => {
    const panel = create_element()
    const [menu_a, menu_b] = [create_element(), create_element()]
    const panel_filler = create_element()
    for (const menu of [menu_a, menu_b]) menu.className = `header-menu-root`
    panel.append(menu_a, panel_filler, menu_b)

    const { callback } = listen({ inside: [`.header-menu-root`] })

    press(menu_a)
    press(menu_b)
    expect(callback).not.toHaveBeenCalled()

    // between the two menus but still inside the panel: an attached surface would
    // have to count this as inside, a node-less listener must not
    press(panel_filler)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it(`dispatches no dismiss event and still calls back without a node`, () => {
    // dismiss does not bubble, so this negative assertion requires capture.
    const document_listener = vi.fn()
    document.addEventListener(`dismiss`, document_listener, true)
    cleanups.push(() => document.removeEventListener(`dismiss`, document_listener, true))
    const { callback } = listen()

    expect(() => press(create_element())).not.toThrow()
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0]).toMatchObject({ via: `pointer` })
    expect(document_listener).not.toHaveBeenCalled()
  })

  it(`escape reports focus_inside from the inside selectors alone`, () => {
    const menu = create_element()
    menu.className = `header-menu-root`
    const focusable = document.createElement(`button`)
    menu.append(focusable)
    focusable.focus()

    const { callback } = listen({ inside: [`.header-menu-root`], escape: true })
    document.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true, cancelable: true }),
    )

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0]).toMatchObject({ focus_inside: true, via: `escape` })
  })

  it(`disabled registers no listener and returns a callable cleanup`, () => {
    const { callback, cleanup } = listen({ enabled: false })

    press(create_element())
    expect(callback).not.toHaveBeenCalled()
    expect(() => cleanup()).not.toThrow()
  })

  it(`a node passed in still counts as inside and receives the dismiss event`, () => {
    const node = create_element()
    const dismiss_listener = vi.fn()
    node.addEventListener(`dismiss`, dismiss_listener)
    const { callback } = listen({ node })

    press(node)
    expect(callback).not.toHaveBeenCalled()

    press(create_element())
    expect(callback).toHaveBeenCalledTimes(1)
    expect(dismiss_listener).toHaveBeenCalledTimes(1)
  })
})

describe(`hotkey`, () => {
  const keydown = (target: EventTarget, key: string, modifiers = {}) => {
    const event = new KeyboardEvent(`keydown`, {
      key,
      bubbles: true,
      cancelable: true,
      ...modifiers,
    })
    target.dispatchEvent(event)
    return event
  }

  // a global binding outlives document.body.innerHTML = '', so dispose every one
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })
  const attach_hotkey = (
    options: Parameters<typeof hotkey>[0],
    node = create_element(),
  ) => {
    const cleanup = hotkey(options)(node)
    if (cleanup) cleanups.push(cleanup)
    return { node, cleanup }
  }

  it(`fires on its own node only, and anywhere on the page when global`, () => {
    const handler = vi.fn()
    const { node, cleanup } = attach_hotkey({ bindings: [{ keys: `ctrl+k`, handler }] })

    const event = keydown(node, `k`, { ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)

    keydown(create_element(), `k`, { ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    cleanup?.()
    keydown(node, `k`, { ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    // `global` is the opt-out: that binding answers from anywhere on the page
    const anywhere = vi.fn()
    attach_hotkey({ bindings: [{ keys: `ctrl+j`, handler: anywhere }], global: true })
    keydown(create_element(), `j`, { ctrlKey: true })
    expect(anywhere).toHaveBeenCalledTimes(1)
  })

  it(`leaves bare keys to text fields unless told otherwise`, () => {
    const input = create_element(`input`)
    const [typed, forced, chord] = [vi.fn(), vi.fn(), vi.fn()]
    attach_hotkey({
      global: true,
      bindings: [
        { keys: `/`, handler: typed },
        { keys: `?`, handler: forced, allow_in_inputs: true },
        { keys: `ctrl+/`, handler: chord },
      ],
    })

    keydown(input, `/`)
    expect(typed).not.toHaveBeenCalled() // the user is typing a slash

    keydown(input, `?`)
    expect(forced).toHaveBeenCalledTimes(1)

    keydown(input, `/`, { ctrlKey: true })
    expect(chord).toHaveBeenCalledTimes(1) // a chord is never typing
  })

  it(`runs the first enabled match only and can leave the default alone`, () => {
    const [off, first, second] = [vi.fn(), vi.fn(), vi.fn()]
    const { node } = attach_hotkey({
      bindings: [
        { keys: `ctrl+k`, handler: off, enabled: false },
        { keys: [`ctrl+j`, `ctrl+k`], handler: first, prevent_default: false },
        { keys: `ctrl+k`, handler: second },
      ],
    })

    const event = keydown(node, `k`, { ctrlKey: true })
    expect(off).not.toHaveBeenCalled()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it.each([
    [`Macintosh; Intel Mac OS X 10_15`, { metaKey: true }, { ctrlKey: true }],
    [`X11; Linux x86_64`, { ctrlKey: true }, { metaKey: true }],
  ])(`mod follows the platform (%s)`, (user_agent, matching, other) => {
    cleanups.push(stub_prop(globalThis.navigator, `userAgent`, user_agent))
    const handler = vi.fn()
    const { node } = attach_hotkey({ bindings: [{ keys: `mod+k`, handler }] })

    keydown(node, `k`, other)
    expect(handler).not.toHaveBeenCalled()

    keydown(node, `k`, matching)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it(`stays quiet mid IME composition and when disabled`, () => {
    const node = create_element()
    const handler = vi.fn()
    const { cleanup } = attach_hotkey(
      { bindings: [{ keys: `ctrl+k`, handler }], enabled: false },
      node,
    )
    expect(cleanup).toBeUndefined()
    keydown(node, `k`, { ctrlKey: true })
    expect(handler).not.toHaveBeenCalled()

    attach_hotkey({ bindings: [{ keys: `Enter`, handler }] }, node)
    keydown(node, `Enter`, { isComposing: true })
    expect(handler).not.toHaveBeenCalled()
    keydown(node, `Enter`)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})

describe(`focus_trap`, () => {
  const make_surface = (count = 3) => {
    const surface = create_element()
    const buttons = Array.from({ length: count }, () => {
      const button = document.createElement(`button`)
      surface.append(button)
      return button
    })
    return { surface, buttons }
  }

  // returned so callers can assert whether the key was swallowed
  const press_key = (key: string, shiftKey = false) => {
    const event = new KeyboardEvent(`keydown`, {
      key,
      bubbles: true,
      cancelable: true,
      shiftKey,
    })
    document.dispatchEvent(event)
    return event
  }
  const press_tab = (shiftKey = false) => press_key(`Tab`, shiftKey)
  const press_escape = () => press_key(`Escape`)

  // focus lands outside, then the microtask a recapture would schedule gets to run
  const focus_out_to = async (target: HTMLElement) => {
    target.focus()
    await Promise.resolve()
    return document.activeElement
  }

  // the trap layer stack is module-global, so a leaked trap steers a later test's Tab
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })
  const attach_trap = (surface: HTMLElement, options: FocusTrapOptions = {}) => {
    const cleanup = focus_trap(options)(surface)
    if (cleanup) cleanups.push(cleanup)
    return cleanup
  }

  it(`focuses the first tabbable, then cycles Tab both ways past the ends`, () => {
    const { surface, buttons } = make_surface()
    attach_trap(surface)
    expect(document.activeElement).toBe(buttons[0])

    press_tab()
    expect(document.activeElement).toBe(buttons[1])
    press_tab()
    press_tab()
    expect(document.activeElement).toBe(buttons[0]) // wrapped past the last
    press_tab(true)
    expect(document.activeElement).toBe(buttons[2]) // and back past the first
  })

  it(`skips candidates the keyboard cannot reach`, () => {
    const { surface, buttons } = make_surface()
    buttons[1].disabled = true
    buttons[2].tabIndex = -1
    const reachable = document.createElement(`a`)
    reachable.href = `#target`
    surface.append(reachable)

    attach_trap(surface)
    expect(document.activeElement).toBe(buttons[0])
    press_tab()
    expect(document.activeElement).toBe(reachable)
  })

  // an <a href> inside an <svg> is focusable and matches tabbable_selector, but it is an
  // SVGElement, so looking the active element up with a HTMLElement-typed indexOf misses
  // it and Tab jumps back to the edge instead of stepping to the neighbour
  it(`steps past an SVG focusable instead of jumping to the edge`, () => {
    const { surface, buttons } = make_surface()
    const svg = document.createElementNS(`http://www.w3.org/2000/svg`, `svg`)
    const svg_link = document.createElementNS(`http://www.w3.org/2000/svg`, `a`)
    svg_link.setAttribute(`href`, `#target`)
    svg.append(svg_link)
    buttons[0].after(svg)

    attach_trap(surface)
    svg_link.focus()
    expect(document.activeElement).toBe(svg_link)

    press_tab()
    expect(document.activeElement).toBe(buttons[1])
  })

  it.each([
    [`a selector`, `.wanted`],
    [`no initial focus`, false],
  ] as const)(`initial: %s`, (_desc, initial) => {
    const { surface, buttons } = make_surface()
    buttons[2].className = `wanted`
    const outside = create_element(`button`)
    outside.focus()

    attach_trap(surface, { initial })
    expect(document.activeElement).toBe(initial === false ? outside : buttons[2])
  })

  it(`restores to the trigger, to a named element, or wherever the user moved it`, () => {
    const trigger = create_element(`button`)
    trigger.focus()
    const { surface } = make_surface()
    focus_trap()(surface)?.()
    expect(document.activeElement).toBe(trigger)

    const elsewhere = create_element(`button`)
    focus_trap({ restore: elsewhere })(surface)?.()
    expect(document.activeElement).toBe(elsewhere)

    // a deliberate move out during the trap's life outranks the recorded trigger
    trigger.focus()
    const cleanup = focus_trap()(surface)
    elsewhere.focus()
    cleanup?.()
    expect(document.activeElement).toBe(elsewhere)
  })

  it(`gives Tab to the innermost trap only`, () => {
    const outer = make_surface()
    const inner = make_surface()
    attach_trap(outer.surface)
    const cleanup_inner = attach_trap(inner.surface)
    expect(document.activeElement).toBe(inner.buttons[0])

    press_tab()
    expect(document.activeElement).toBe(inner.buttons[1])

    // the outer trap takes over once the inner surface is gone
    cleanup_inner?.()
    outer.buttons[0].focus()
    press_tab()
    expect(document.activeElement).toBe(outer.buttons[1])
  })

  // The trap listens on the document, so a surface that was never given focus must
  // not confiscate Tab from the rest of the page. Nav pins a submenu while focus
  // stays on the toggle outside it, and Tab there has to keep walking the page.
  it(`leaves Tab alone while focus sits outside the trap`, () => {
    const { surface, buttons } = make_surface()
    const outside = create_element(`button`)
    outside.focus()

    attach_trap(surface, { initial: false })
    expect(document.activeElement).toBe(outside) // initial: false kept focus put

    const event = press_tab()
    expect(document.activeElement).toBe(outside) // not dragged into the surface
    expect(event.defaultPrevented).toBe(false) // the browser still gets its Tab

    // once focus is inside, the trap takes over again
    buttons[0].focus()
    press_tab()
    expect(document.activeElement).toBe(buttons[1])
  })

  it(`covers portalled parts of the same surface via include`, () => {
    const { surface, buttons } = make_surface(1)
    const portalled = create_element() // moved to body, no longer a descendant
    const portalled_button = document.createElement(`button`)
    portalled.append(portalled_button)

    attach_trap(surface, { include: [null, portalled] })
    expect(document.activeElement).toBe(buttons[0])
    press_tab()
    expect(document.activeElement).toBe(portalled_button)
  })

  it(`does nothing when disabled`, () => {
    const { surface } = make_surface()
    const outside = create_element(`button`)
    outside.focus()

    expect(focus_trap({ enabled: false })(surface)).toBeUndefined()
    expect(document.activeElement).toBe(outside)
    press_tab()
    expect(document.activeElement).toBe(outside)
  })

  // The shape hive's modals have: a layer element wrapping a backdrop button and the
  // dialog beside it, where only the dialog belongs in the Tab cycle.
  const make_layer = () => {
    const layer = create_element()
    const backdrop = document.createElement(`button`)
    const dialog = document.createElement(`section`)
    dialog.className = `dialog`
    const first = document.createElement(`button`)
    const last = document.createElement(`button`)
    dialog.append(first, last)
    layer.append(backdrop, dialog)
    return { layer, backdrop, dialog, first, last }
  }

  it(`without root the whole node is the trap, backdrop included`, () => {
    const { layer, backdrop, first } = make_layer()
    attach_trap(layer)
    expect(document.activeElement).toBe(backdrop) // first tabbable in DOM order
    press_tab()
    expect(document.activeElement).toBe(first)
  })

  it.each([`selector`, `element`, `function`] as const)(
    `root as %s keeps the sibling backdrop out of the Tab cycle`,
    (kind) => {
      const { layer, backdrop, dialog, first, last } = make_layer()
      const root =
        kind === `selector` ? `.dialog` : kind === `element` ? dialog : () => dialog
      attach_trap(layer, { root })

      expect(document.activeElement).toBe(first) // the backdrop is no longer reachable
      press_tab()
      expect(document.activeElement).toBe(last)
      press_tab()
      expect(document.activeElement).toBe(first) // wrapped, never onto the backdrop
      press_tab(true)
      expect(document.activeElement).toBe(last)

      // `root` narrows what Tab cycles, not what counts as inside: clicking the backdrop
      // focuses it, and if that read as outside the trap it would disarm Tab entirely
      backdrop.focus()
      expect(press_tab().defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(first)
    },
  )

  it(`resolves initial within root, and falls back to the node when root finds nothing`, () => {
    const { layer, dialog, last } = make_layer()
    const decoy = document.createElement(`button`)
    decoy.className = `wanted` // outside the root, so the selector must not reach it
    layer.prepend(decoy)
    last.className = `wanted`
    attach_trap(layer, { root: dialog, initial: `.wanted` })
    expect(document.activeElement).toBe(last)

    const unresolvable = make_layer()
    attach_trap(unresolvable.layer, { root: () => null })
    expect(document.activeElement).toBe(unresolvable.backdrop) // back to the node
  })

  it(`calls on_escape for the innermost trap only, and swallows the key`, () => {
    const outer = make_surface()
    const inner = make_surface()
    const on_outer = vi.fn()
    const on_inner = vi.fn()
    attach_trap(outer.surface, { on_escape: on_outer })
    const cleanup_inner = attach_trap(inner.surface, { on_escape: on_inner })

    const event = press_escape()
    expect(on_inner).toHaveBeenCalledTimes(1)
    expect(on_outer).not.toHaveBeenCalled()
    // cancelled on purpose: a native <dialog> around the surface then stays open
    // until a second Escape lands with this layer gone
    expect(event.defaultPrevented).toBe(true)

    cleanup_inner?.()
    press_escape()
    expect(on_outer).toHaveBeenCalledTimes(1)
    expect(on_inner).toHaveBeenCalledTimes(1)
  })

  it(`leaves Escape untouched when no handler is given`, () => {
    const { surface } = make_surface()
    attach_trap(surface)
    expect(press_escape().defaultPrevented).toBe(false)
  })

  // ported from hive's modal-focus test: focus that escapes comes back to the element
  // that last held it inside, not to the entry point the trap opened on
  it(`recapture pulls focus back to the last element that held it inside`, async () => {
    const { surface, buttons } = make_surface()
    attach_trap(surface, { recapture: true })
    expect(document.activeElement).toBe(buttons[0])

    buttons[2].focus()
    expect(await focus_out_to(create_element(`button`))).toBe(buttons[2])
  })

  // A recapture re-resolves `root`, so a trap can inject its fallback tabindex into
  // more than one element over its life and owes all of them a cleanup.
  it(`takes the injected tabindex off every root it fell back to`, async () => {
    const surface = create_element()
    // no tabbables in either panel, so the root itself is the fallback focus target
    const panels = [document.createElement(`div`), document.createElement(`div`)]
    surface.append(...panels)
    let current = panels[0]

    const cleanup = attach_trap(surface, {
      root: () => current,
      recapture: true,
      restore: false,
    })
    expect(panels[0].getAttribute(`tabindex`)).toBe(`-1`)

    // the first panel goes away as focus leaves, so the recapture resolves the other
    current = panels[1]
    create_element(`button`).focus()
    panels[0].remove()
    await Promise.resolve()
    expect(panels[1].getAttribute(`tabindex`)).toBe(`-1`)

    cleanup?.()
    expect(panels.map((panel) => panel.hasAttribute(`tabindex`))).toEqual([false, false])
  })

  // the counterpart of the holds_focus guard on Tab: a trap that was never given
  // focus must not summon it on every focus move elsewhere on the page
  it(`recapture stays out of focus moves that never touched the trap`, async () => {
    const { surface } = make_surface()
    const elsewhere = create_element(`button`)
    attach_trap(surface, { recapture: true, initial: false })

    create_element(`button`).focus() // a focus move that never touches the trap
    expect(await focus_out_to(elsewhere)).toBe(elsewhere)
  })

  it(`leaves escaped focus alone without recapture, and after teardown with it`, async () => {
    const { surface, buttons } = make_surface()
    const outside = create_element(`button`)

    const cleanup_plain = attach_trap(surface, { restore: false })
    buttons[1].focus()
    expect(await focus_out_to(outside)).toBe(outside) // no recapture by default
    cleanup_plain?.()

    const cleanup = focus_trap({ recapture: true, restore: false })(surface)
    buttons[1].focus()
    cleanup?.()
    expect(await focus_out_to(outside)).toBe(outside) // a torn-down trap stops recapturing
  })

  // Hygiene rather than behaviour — the guard above already silences a late microtask —
  // but without this every surface that opens leaks a pair of document listeners for
  // the rest of the page's life.
  it(`recapture takes its document listeners off again on teardown`, () => {
    const removals = vi.spyOn(document, `removeEventListener`)
    focus_trap({ recapture: true, restore: false })(make_surface().surface)?.()

    expect(removals.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining([`focusin`, `focusout`]),
    )
    removals.mockRestore()
  })
})

describe(`draggable`, () => {
  // fixed positioning makes the attachment read getBoundingClientRect, which mock_rect
  // controls; the offset* fallback path has its own case below
  const create_fixed_box = (rect = { left: 10, top: 20 }) => {
    const element = create_element(`div`, { position: `fixed` })
    mock_rect(element, rect)
    return element
  }

  it(`updates position, callbacks, cursor and userSelect while dragging`, () => {
    const element = create_fixed_box()
    const [on_drag_start, on_drag, on_drag_end] = [vi.fn(), vi.fn(), vi.fn()]

    const cleanup = draggable({ on_drag_start, on_drag, on_drag_end })(element)
    expect(element.style.cursor).toBe(`grab`)

    element.dispatchEvent(pointer_event(`pointerdown`, 5, 5))
    expect(element.style.left).toBe(`10px`)
    expect(element.style.top).toBe(`20px`)
    expect(element.style.cursor).toBe(`grabbing`)
    expect(document.body.style.userSelect).toBe(`none`)
    expect(on_drag_start).toHaveBeenCalledOnce()

    globalThis.dispatchEvent(pointer_event(`pointermove`, 15, 25))
    expect(element.style.left).toBe(`20px`)
    expect(element.style.top).toBe(`40px`)
    expect(on_drag).toHaveBeenCalledOnce()

    globalThis.dispatchEvent(pointer_event(`pointerup`, 0, 0))
    expect(on_drag_end).toHaveBeenCalledOnce()
    expect(element.style.cursor).toBe(`grab`)
    expect(document.body.style.userSelect).toBe(``)

    cleanup?.()
    expect(element.style.cursor).toBe(``)
    expect(element.style.touchAction).toBe(``)
  })

  it(`drags from a touch and sets touch-action`, () => {
    const element = create_fixed_box()
    draggable({})(element)
    expect(element.style.touchAction).toBe(`none`)

    element.dispatchEvent(pointer_event(`pointerdown`, 5, 5, { pointerType: `touch` }))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 15, 25))
    expect([element.style.left, element.style.top]).toEqual([`20px`, `40px`])
    globalThis.dispatchEvent(pointer_event(`pointerup`, 15, 25, { pointerType: `touch` }))
    expect(document.body.style.userSelect).toBe(``)
  })

  it(`ignores moves and releases from another pointer`, () => {
    const element = create_fixed_box()
    const on_drag_end = vi.fn()
    draggable({ on_drag_end })(element)

    element.dispatchEvent(pointer_event(`pointerdown`, 5, 5, { pointerId: 1 }))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 50, 50, { pointerId: 2 }))
    globalThis.dispatchEvent(pointer_event(`pointerup`, 50, 50, { pointerId: 2 }))
    expect([element.style.left, element.style.top]).toEqual([`10px`, `20px`])
    expect(on_drag_end).not.toHaveBeenCalled()

    globalThis.dispatchEvent(pointer_event(`pointermove`, 15, 25, { pointerId: 1 }))
    globalThis.dispatchEvent(pointer_event(`pointerup`, 15, 25, { pointerId: 1 }))
    expect([element.style.left, element.style.top]).toEqual([`20px`, `40px`])
    expect(on_drag_end).toHaveBeenCalledOnce()
  })

  it.each([
    [`a non-primary button`, { button: 2 }],
    [`a second finger`, { isPrimary: false }],
  ])(`does not start dragging from %s`, (_desc, init) => {
    const element = create_fixed_box()
    draggable({})(element)
    element.dispatchEvent(pointer_event(`pointerdown`, 5, 5, init))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 50, 50))
    expect([element.style.left, element.style.top]).toEqual([``, ``])
  })

  it(`ends the drag when the pointer is cancelled`, () => {
    const element = create_fixed_box()
    const on_drag_end = vi.fn()
    draggable({ on_drag_end })(element)

    element.dispatchEvent(pointer_event(`pointerdown`, 5, 5))
    globalThis.dispatchEvent(pointer_event(`pointercancel`, 0, 0))
    expect(on_drag_end).toHaveBeenCalledOnce()
    expect(document.body.style.userSelect).toBe(``)
    globalThis.dispatchEvent(pointer_event(`pointermove`, 50, 50))
    expect([element.style.left, element.style.top]).toEqual([`10px`, `20px`])
  })

  it(`does not set up dragging when disabled`, () => {
    const element = create_fixed_box()
    const cleanup = draggable({ disabled: true })(element)
    expect(cleanup).toBeUndefined()
    expect(element.style.cursor).toBe(``)

    element.dispatchEvent(pointer_event(`pointerdown`, 5, 5))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 50, 50))
    expect([element.style.left, element.style.top]).toEqual([``, ``])
  })

  it(`warns and returns undefined for a missing handle selector`, () => {
    const element = create_element()
    const warn_spy = vi.spyOn(console, `warn`).mockImplementation(() => {})

    const cleanup = draggable({ handle_selector: `.nonexistent` })(element)

    expect(cleanup).toBeUndefined()
    expect(warn_spy).toHaveBeenCalledWith(expect.stringContaining(`.nonexistent`))
    warn_spy.mockRestore()
  })

  it(`drags only when the event originates from handle_selector`, () => {
    const element = create_fixed_box({ left: 0, top: 0 })

    const handle = document.createElement(`div`)
    handle.className = `drag-handle`
    element.append(handle)

    const attach = draggable({ handle_selector: `.drag-handle` })
    attach(element)

    // press on element (not handle) should not start dragging
    element.dispatchEvent(pointer_event(`pointerdown`, 0, 0))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 50, 50))
    expect(element.style.left).toBe(``)
    expect(element.style.top).toBe(``)

    // press on handle should start dragging
    handle.dispatchEvent(pointer_event(`pointerdown`, 0, 0))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 30, 40))
    expect(element.style.left).toBe(`30px`)
    expect(element.style.top).toBe(`40px`)
  })

  it(`uses offsetLeft/offsetTop for non-fixed positioning`, () => {
    const element = create_element()
    element.style.position = `absolute`
    // Mock offsetLeft and offsetTop (these are read-only, so we use Object.defineProperty)
    Object.defineProperty(element, `offsetLeft`, { value: 25, configurable: true })
    Object.defineProperty(element, `offsetTop`, { value: 35, configurable: true })

    const attach = draggable()
    attach(element)

    element.dispatchEvent(pointer_event(`pointerdown`, 10, 10))

    expect(element.style.left).toBe(`25px`)
    expect(element.style.top).toBe(`35px`)

    // Drag to new position
    globalThis.dispatchEvent(pointer_event(`pointermove`, 30, 50))
    expect(element.style.left).toBe(`45px`) // 25 + (30-10)
    expect(element.style.top).toBe(`75px`) // 35 + (50-10)
  })

  it(`ignores global drag events before dragging starts`, () => {
    const on_drag = vi.fn()
    const on_drag_end = vi.fn()
    draggable({ on_drag, on_drag_end })(create_element())

    globalThis.dispatchEvent(pointer_event(`pointermove`, 100, 100))
    globalThis.dispatchEvent(pointer_event(`pointerup`, 0, 0))

    expect(on_drag).not.toHaveBeenCalled()
    expect(on_drag_end).not.toHaveBeenCalled()
  })

  it(`resets body userSelect and cursor when cleaned up mid-drag`, () => {
    const element = create_fixed_box({ left: 0, top: 0 })

    const cleanup = draggable()(element)
    element.dispatchEvent(pointer_event(`pointerdown`, 5, 5))
    expect(document.body.style.userSelect).toBe(`none`)
    expect(element.style.cursor).toBe(`grabbing`)

    cleanup?.() // unmount mid-drag, before any release
    expect(document.body.style.userSelect).toBe(``)
    expect(element.style.cursor).toBe(``)

    globalThis.dispatchEvent(pointer_event(`pointermove`, 100, 100))
    expect(element.style.left).toBe(`0px`)
    expect(element.style.top).toBe(`0px`)
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

    vi.stubGlobal(`CSS`, {
      highlights: {
        clear: clear_highlights_spy,
        get: (key: string) => mock_css_highlights.get(key),
        set: set_highlights_spy,
        delete: delete_highlights_spy,
      },
    })
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

  // the timing cases below opt into fake timers individually, so undo it centrally
  afterEach(() => vi.useRealTimers())

  const get_highlight_ranges = (): Range[] => {
    const highlight = mock_css_highlights.get(`highlight-match`) as
      | { ranges?: Range[] }
      | undefined
    if (!Array.isArray(highlight?.ranges)) throw new Error(`Expected highlight ranges`)
    return highlight.ranges
  }

  it.each([
    // Early returns
    [`no query`, ``, `test`, false, undefined, undefined],
    [`whitespace-only query`, ` \t\n `, `a b`, false, undefined, undefined],

    // Substring highlighting (fuzzy=false)
    [`substring match`, `test`, `<p>This is a test paragraph</p>`, false, 1, undefined],
    [`case insensitive`, `test`, `<p>Test with TEST and TeSt</p>`, false, 3, undefined],
    [`no cross-node match`, `bc`, `<ul><li>ab</li><li>cd</li></ul>`, false, 0, undefined],
    [`no matches`, `xyz`, `<p>Content without search term</p>`, false, 0, undefined],

    // Fuzzy highlighting (fuzzy=true)
    [`fuzzy no matches`, `xyz`, `<p>Content without search term</p>`, true, 0, undefined],
    [
      `skip with node_filter`,
      `test`,
      `<div>Test content</div><li class="user-msg">Test hidden</li>`,
      false,
      1,
      (node: Node) =>
        node?.parentElement?.closest(`li.user-msg`)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    ],
  ])(`%s`, (_desc, query, html_content, fuzzy, expected_range_count, node_filter) => {
    mock_element.innerHTML = html_content
    const cleanup = highlight_matches({ query, fuzzy, node_filter })(mock_element)

    expect(mock_css_highlights.size).toBe(expected_range_count === undefined ? 0 : 1)
    expect(clear_highlights_spy).not.toHaveBeenCalled()
    if (expected_range_count !== undefined) {
      expect(set_highlights_spy).toHaveBeenCalledWith(
        `highlight-match`,
        expect.any(Object),
      )
      expect(get_highlight_ranges()).toHaveLength(expected_range_count)
    }
    cleanup?.()
  })

  it(`normalizes query and source whitespace without shifting ranges`, () => {
    mock_element.textContent = `form\n submit`
    const cleanup = highlight_matches({ query: ` form  submit ` })(mock_element)

    expect(get_highlight_ranges().map((range) => range.toString())).toEqual([
      `form\n submit`,
    ])
    cleanup?.()
  })

  it.each([
    [`CSS is missing`, () => vi.stubGlobal(`CSS`, undefined)],
    // a registry without the constructor is what a partial polyfill or a stub in a
    // consumer's test leaves behind; constructing a Highlight there throws
    [`Highlight is missing`, () => vi.stubGlobal(`Highlight`, undefined)],
  ])(`runs range effects when %s`, (_desc, prepare) => {
    prepare()
    mock_element.textContent = `PageSearch result`
    const on_highlight = vi.fn()

    const cleanup = highlight_matches({ query: `PageSearch`, on_highlight })(mock_element)

    expect(on_highlight).toHaveBeenCalledExactlyOnceWith({
      node: mock_element,
      ranges: [expect.any(Range)],
    })
    expect(set_highlights_spy).not.toHaveBeenCalled()
    cleanup?.()
  })

  it.each([
    [
      `default smooth centered scrolling`,
      undefined,
      { behavior: `smooth`, block: `center` },
    ],
    [`disabled scrolling`, false, undefined],
    [
      `custom scrolling`,
      { behavior: `instant`, block: `start`, inline: `nearest` },
      { behavior: `instant`, block: `start`, inline: `nearest` },
    ],
  ] as const)(`supports %s`, (_description, scroll_to_match, expected_options) => {
    mock_element.textContent = `PageSearch result`
    const scroll_into_view = vi.fn()
    mock_element.scrollIntoView = scroll_into_view

    const cleanup = highlight_matches({
      query: `PageSearch`,
      scroll_to_match,
    })(mock_element)

    expect(scroll_into_view.mock.calls).toEqual(
      expected_options ? [[expected_options]] : [],
    )
    cleanup?.()
  })

  it(`fuzzy highlighting marks matching characters in order`, () => {
    mock_element.innerHTML = `<p>allow-user-options</p>`

    highlight_matches({ query: `auo`, fuzzy: true })(mock_element)

    const ranges = get_highlight_ranges()
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
      const ranges = get_highlight_ranges()
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

  it.each([
    [`astral character`, `😀x`, `😀`, [[0, 2]]],
    [`length-changing lowercase`, `İx`, `İ`, [[0, 1]]],
  ] as const)(
    `fuzzy highlighting keeps each %s range whole`,
    (_description, text, query, expected) => {
      mock_element.textContent = text

      highlight_matches({ query, fuzzy: true })(mock_element)

      expect(
        get_highlight_ranges().map((range) => [range.startOffset, range.endOffset]),
      ).toEqual(expected)
    },
  )

  it(`updates highlights when matching text is inserted`, async () => {
    const scroll_into_view = vi.fn()
    mock_element.scrollIntoView = scroll_into_view
    const effect_cleanup = vi.fn()
    const on_highlight = vi.fn(() => effect_cleanup)
    const cleanup = highlight_matches({ query: `PageSearch`, on_highlight })(mock_element)
    expect(scroll_into_view).not.toHaveBeenCalled()
    expect(on_highlight).toHaveBeenCalledExactlyOnceWith({
      node: mock_element,
      ranges: [],
    })
    mock_element.textContent = `PageSearch excerpt`
    await Promise.resolve()

    expect(mock_css_highlights.get(`highlight-match`)).toMatchObject({
      ranges: [expect.any(Range)],
    })
    expect(scroll_into_view).toHaveBeenCalledExactlyOnceWith({
      behavior: `smooth`,
      block: `center`,
    })
    expect(on_highlight).toHaveBeenCalledTimes(2)
    expect(effect_cleanup).toHaveBeenCalledOnce()
    cleanup?.()
    mock_element.textContent = `PageSearch updated excerpt`
    await Promise.resolve()

    expect(effect_cleanup).toHaveBeenCalledTimes(2)
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)
  })

  it(`supports timed highlights and opt-in range effects`, async () => {
    vi.useFakeTimers()
    mock_element.textContent = `PageSearch result`
    const effect_cleanup = vi.fn()

    const cleanup = highlight_matches({
      query: `PageSearch`,
      duration_ms: 50,
      on_highlight: () => effect_cleanup,
    })(mock_element)

    await vi.advanceTimersByTimeAsync(50)
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)
    expect(effect_cleanup).toHaveBeenCalledOnce()

    cleanup?.()
    expect(effect_cleanup).toHaveBeenCalledOnce()
  })

  it(`removes highlights when range effect setup or cleanup throws`, () => {
    mock_element.textContent = `PageSearch result`

    expect(() =>
      highlight_matches({
        query: `PageSearch`,
        on_highlight: () => {
          throw new Error(`effect failed`)
        },
      })(mock_element),
    ).toThrow(`effect failed`)
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)

    const cleanup = highlight_matches({
      query: `PageSearch`,
      on_highlight: () => () => {
        throw new Error(`cleanup failed`)
      },
    })(mock_element)
    expect(() => cleanup?.()).toThrow(`cleanup failed`)
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)
  })

  it(`stays disposed when range effect cleanup removes the attachment`, async () => {
    mock_element.textContent = `PageSearch result`
    let cleanup: (() => void) | undefined
    const on_highlight = vi.fn(() => () => cleanup?.())
    cleanup = highlight_matches({ query: `PageSearch`, on_highlight })(mock_element)

    mock_element.textContent = `Updated PageSearch result`
    await Promise.resolve()

    expect(on_highlight).toHaveBeenCalledOnce()
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)
  })

  it(`aggregates same-name highlights across attached elements`, () => {
    const second_element = document.createElement(`div`)
    mock_element.textContent = `First match`
    second_element.textContent = `Second match`

    const cleanup_first = highlight_matches({ query: `match` })(mock_element)
    const cleanup_second = highlight_matches({ query: `match` })(second_element)

    expect(mock_css_highlights.get(`highlight-match`)).toMatchObject({
      ranges: [expect.any(Range), expect.any(Range)],
    })
    cleanup_first?.()
    expect(mock_css_highlights.get(`highlight-match`)).toMatchObject({
      ranges: [expect.any(Range)],
    })
    cleanup_second?.()
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)
  })

  it.each([
    [`restores a pre-existing`, `keep`],
    [`preserves a later replacement`, `replace`],
    [`respects a later deletion of the`, `delete`],
  ])(`%s same-name highlight`, (_description, external_action) => {
    const previous = { external: `previous` }
    const replacement = { external: `replacement` }
    mock_css_highlights.set(`highlight-match`, previous)
    mock_element.textContent = `match`

    const cleanup = highlight_matches({ query: `match` })(mock_element)
    if (external_action === `replace`)
      mock_css_highlights.set(`highlight-match`, replacement)
    if (external_action === `delete`) mock_css_highlights.delete(`highlight-match`)
    cleanup?.()

    expect(mock_css_highlights.get(`highlight-match`)).toBe(
      external_action === `replace`
        ? replacement
        : external_action === `keep`
          ? previous
          : undefined,
    )
  })

  it(`observe_mutations: false freezes the highlight at attach time`, async () => {
    mock_element.textContent = `nothing here`
    const cleanup = highlight_matches({
      query: `PageSearch`,
      observe_mutations: false,
    })(mock_element)

    mock_element.textContent = `PageSearch excerpt`
    await Promise.resolve()

    expect(get_highlight_ranges()).toHaveLength(0)
    cleanup?.()
  })

  it(`debounced observation coalesces a burst into one re-run`, async () => {
    vi.useFakeTimers()
    mock_element.textContent = `nothing here`
    const on_highlight = vi.fn()
    const cleanup = highlight_matches({
      query: `line`,
      on_highlight,
      observe_mutations: { debounce_ms: 50, max_wait_ms: 1000 },
    })(mock_element)
    expect(on_highlight).toHaveBeenCalledTimes(1) // the initial run

    for (const idx of [1, 2, 3]) {
      mock_element.append(document.createTextNode(` line ${idx}`))
      await vi.advanceTimersByTimeAsync(20) // shorter than debounce_ms
    }
    expect(on_highlight).toHaveBeenCalledTimes(1) // still nothing but the initial run

    await vi.advanceTimersByTimeAsync(50)
    expect(on_highlight).toHaveBeenCalledTimes(2)
    expect(get_highlight_ranges()).toHaveLength(3)
    cleanup?.()
  })

  it(`max_wait_ms forces a re-run through a burst that never pauses`, async () => {
    vi.useFakeTimers()
    mock_element.textContent = `nothing here`
    const on_highlight = vi.fn()
    const cleanup = highlight_matches({
      query: `line`,
      on_highlight,
      observe_mutations: { debounce_ms: 50, max_wait_ms: 120 },
    })(mock_element)

    // a mutation every 40 ms would reset a plain debounce forever
    for (const idx of [1, 2, 3, 4]) {
      mock_element.append(document.createTextNode(` line ${idx}`))
      await vi.advanceTimersByTimeAsync(40)
    }

    expect(on_highlight).toHaveBeenCalledTimes(2) // initial run plus the capped one
    cleanup?.()
  })

  it(`cleanup drops a pending debounced re-run`, async () => {
    vi.useFakeTimers()
    mock_element.textContent = `nothing here`
    const on_highlight = vi.fn()
    const cleanup = highlight_matches({
      query: `line`,
      on_highlight,
      observe_mutations: { debounce_ms: 50 },
    })(mock_element)

    mock_element.append(document.createTextNode(` line 1`))
    await vi.advanceTimersByTimeAsync(10)
    expect(vi.getTimerCount()).toBe(1)

    cleanup?.()
    // disarmed, not merely ignored: a live timer holds the closure (and, in node,
    // the event loop) until it fires
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(100)

    expect(on_highlight).toHaveBeenCalledTimes(1)
    expect(mock_css_highlights.has(`highlight-match`)).toBe(false)
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
    table.innerHTML = `<thead><tr><th>Planet</th><th>Moons</th></tr></thead>
      <tbody><tr><td>Mars</td><td>2</td></tr>
      <tr><td>Earth</td><td>1</td></tr>
      <tr><td>Jupiter</td><td>95</td></tr></tbody>`
    document.body.append(table)
    return table
  }

  const get_column_values = (table: HTMLTableElement, col_idx: number) =>
    Array.from(table.querySelectorAll(`tbody tr`)).map(
      (row) => row.children[col_idx].textContent,
    )

  it(`sorts ascending then descending when clicking the same header`, () => {
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

  it(`does not set up sorting when disabled`, () => {
    const table = create_table()
    expect(sortable({ disabled: true })(table)).toBeUndefined()
    const header = get_required_header(table)
    expect(header.style.cursor).toBe(``)

    header.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    expect(get_column_values(table, 0)).toEqual([`Mars`, `Earth`, `Jupiter`]) // unsorted
    expect(header.classList.contains(`table-sort-asc`)).toBe(false)
  })

  it(`applies custom classes and sorted_style, resetting other columns`, () => {
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
    expect(h1.classList.contains(`desc`)).toBe(false)
    expect(h1.style.backgroundColor).toBe(``) // sorted_style reset too, not just the class
    expect(h1.style.cursor).toBe(`pointer`) // reset must not strip the pointer cursor
    expect(h2.classList.contains(`asc`)).toBe(true)
    expect(h2.style.backgroundColor).toBe(`red`)
  })

  it(`handles an empty table body and a custom header_selector`, () => {
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

  it.each([
    [`whitespace-only cells as empty`, [`   `, `5`, `1`], [`1`, `5`, ``]],
    [
      `mixed numeric and text cells`,
      [`foo`, `10`, `bar`, `2`],
      [`2`, `10`, `bar`, `foo`],
    ],
  ])(`sorts %s correctly`, (_desc, cells, expected) => {
    const table = document.createElement(`table`)
    const rows = cells.map((val: string) => `<tr><td>${val}</td></tr>`).join(``)
    table.innerHTML = `<thead><tr><th>Col</th></tr></thead><tbody>${rows}</tbody>`
    document.body.append(table)

    sortable()(table)
    get_required_header(table).dispatchEvent(new MouseEvent(`click`, { bubbles: true }))

    expect(get_column_values(table, 0).map((val) => val?.trim())).toEqual(expected)
  })

  it(`treats rows with missing cells (colspan placeholder) as empty and sorts them last`, () => {
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

  it(`does not re-parent rows of nested tables when sorting`, () => {
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

  it(`preserves header child markup across sort clicks and cleanup`, () => {
    const table = create_table()
    const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>(`thead th`))
    const [header] = headers
    header.innerHTML = `<span class="icon">▲</span> Planet`
    header.style.color = `blue`

    const cleanup = sortable()(table)
    expect(headers.map(({ style }) => style.cursor)).toEqual([`pointer`, `pointer`])
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
    expect(header.style.color).toBe(`blue`)
    expect(headers.map(({ style }) => style.cursor)).toEqual([``, ``])
    expect(
      headers.some(
        ({ classList }) =>
          classList.contains(`table-sort-asc`) || classList.contains(`table-sort-desc`),
      ),
    ).toBe(false)
  })
})

describe(`resizable`, () => {
  // every case resizes the same 200x150 box unless it needs its own position
  const create_box = (rect = { left: 0, top: 0, width: 200, height: 150 }) => {
    const element = create_element(`div`, { width: `200px`, height: `150px` })
    mock_rect(element, rect)
    return element
  }

  it.each([
    [`right`, undefined, 195, 75, `ew-resize`],
    [`bottom`, undefined, 100, 145, `ns-resize`],
    [`left`, [`left`], 5, 75, `ew-resize`],
    [`top`, [`top`], 100, 5, `ns-resize`],
  ] as const)(
    `applies the resize cursor on %s edge hover`,
    (_edge, edges, clientX, clientY, expected_cursor) => {
      const element = create_box()
      resizable(edges ? { edges: [...edges] } : {})(element)

      element.dispatchEvent(pointer_event(`pointermove`, clientX, clientY))

      expect(element.style.cursor).toBe(expected_cursor)
    },
  )

  // the one visible way back from a manual resize, so it has to clear what the drag wrote
  it.each<[string, ResizableOptions | undefined, number, number, string, string]>([
    [`an edge`, undefined, 195, 75, ``, ``],
    [`the content`, undefined, 100, 75, `320px`, `240px`],
    // width-only must not wipe a consumer-set height
    [`an edge of a width-only instance`, { edges: [`right`] }, 195, 75, ``, `240px`],
  ])(`double-clicking %s clears managed sizes`, (_desc, options, x, y, width, height) => {
    const element = create_box()
    resizable(options)(element)
    element.style.width = `320px`
    element.style.height = `240px`
    element.dispatchEvent(pointer_event(`dblclick`, x, y))
    expect(element.style.width).toBe(width)
    expect(element.style.height).toBe(height)
  })

  // edge-only cancel: touch-action:none on the node would kill content panning
  it.each([
    [`on an edge`, 195, 75, true],
    [`on the content`, 100, 75, false],
  ])(`a touch %s is cancelled: %s`, (_desc, clientX, clientY, prevented) => {
    const element = create_box()
    resizable()(element)
    const event = new TouchEvent(`touchstart`, {
      bubbles: true,
      cancelable: true,
      touches: [{ clientX, clientY } as Touch],
    })
    element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(prevented)
  })

  it(`uses a custom handle_size and resets the cursor away from edges`, () => {
    const element = create_box()
    const cleanup = resizable({ handle_size: 20 })(element)

    element.dispatchEvent(pointer_event(`pointermove`, 185, 75))
    expect(element.style.cursor).toBe(`ew-resize`)

    element.dispatchEvent(pointer_event(`pointermove`, 175, 75))
    expect(element.style.cursor).toBe(``)

    cleanup?.()
    element.dispatchEvent(pointer_event(`pointermove`, 185, 75))
    expect(element.style.cursor).toBe(``)
  })

  it.each([
    [`min_width`, { min_width: 100 }, [195, 75], [50, 75], `width`, `100px`],
    [`max_width`, { max_width: 300 }, [195, 75], [500, 75], `width`, `300px`],
    [`min_height`, { min_height: 80 }, [100, 145], [100, 30], `height`, `80px`],
    [`max_height`, { max_height: 250 }, [100, 145], [100, 400], `height`, `250px`],
  ] as const)(
    `respects the %s constraint`,
    (
      _constraint,
      options,
      [start_client_x, start_client_y],
      [drag_client_x, drag_client_y],
      dimension,
      expected_value,
    ) => {
      const element = create_box()
      resizable(options)(element)

      element.dispatchEvent(pointer_event(`pointerdown`, start_client_x, start_client_y))
      globalThis.dispatchEvent(pointer_event(`pointermove`, drag_client_x, drag_client_y))

      expect(element.style[dimension]).toBe(expected_value)

      globalThis.dispatchEvent(pointer_event(`pointerup`, 0, 0))
    },
  )

  // a second finger drives and ends nothing; the resize belongs to the first, until the OS
  // takes it away
  it(`ignores another pointer, ends on pointercancel`, () => {
    const element = create_box()
    const on_resize_end = vi.fn()
    resizable({ on_resize_end })(element)

    element.dispatchEvent(pointer_event(`pointermove`, 195, 75)) // hover sets the cursor
    element.dispatchEvent(pointer_event(`pointerdown`, 195, 75, { pointerId: 1 }))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 400, 75, { pointerId: 2 }))
    globalThis.dispatchEvent(pointer_event(`pointerup`, 400, 75, { pointerId: 2 }))
    expect(element.style.width).toBe(`200px`) // untouched from create_box
    expect(on_resize_end).not.toHaveBeenCalled()

    globalThis.dispatchEvent(pointer_event(`pointermove`, 250, 75, { pointerId: 1 }))
    element.dispatchEvent(pointer_event(`pointermove`, 250, 75)) // off the edge, mid-resize
    expect(element.style.cursor).toBe(`ew-resize`)

    globalThis.dispatchEvent(pointer_event(`pointercancel`, 250, 75, { pointerId: 1 }))
    expect(element.style.width).toBe(`255px`)
    expect(on_resize_end).toHaveBeenCalledOnce()
    expect(document.body.style.userSelect).toBe(``)
  })

  // every way a gesture can fail to be a resize. A non-primary press matters most: the
  // context menu it opens can swallow the release, leaving the element stuck to the cursor
  it.each([
    [
      `a press away from any edge`,
      (box: HTMLElement) => box.dispatchEvent(pointer_event(`pointerdown`, 100, 75)),
    ],
    [
      `a non-primary button on an edge`,
      (box: HTMLElement) =>
        box.dispatchEvent(pointer_event(`pointerdown`, 195, 75, { button: 2 })),
    ],
    [`a global move with no press at all`, () => {}],
  ])(`does not start resizing on %s`, (_desc, gesture) => {
    const element = create_box()
    const on_resize_start = vi.fn()
    const on_resize = vi.fn()
    const on_resize_end = vi.fn()
    resizable({ on_resize_start, on_resize, on_resize_end })(element)

    gesture(element)
    globalThis.dispatchEvent(pointer_event(`pointermove`, 250, 75))
    globalThis.dispatchEvent(pointer_event(`pointerup`, 0, 0))

    expect(on_resize_start).not.toHaveBeenCalled()
    expect(on_resize).not.toHaveBeenCalled()
    expect(on_resize_end).not.toHaveBeenCalled()
    expect(element.style.width).toBe(`200px`) // untouched from create_box
  })

  it(`fires on_resize_start, on_resize and on_resize_end callbacks`, () => {
    const element = create_box()

    const on_resize_start = vi.fn()
    const on_resize = vi.fn()
    const on_resize_end = vi.fn()

    resizable({ on_resize_start, on_resize, on_resize_end })(element)

    element.dispatchEvent(pointer_event(`pointerdown`, 195, 75))
    expect(document.body.style.userSelect).toBe(`none`)
    expect(on_resize_start).toHaveBeenCalledTimes(1)
    expect(on_resize_start).toHaveBeenCalledWith(expect.any(PointerEvent), {
      width: 200,
      height: 150,
    })

    globalThis.dispatchEvent(pointer_event(`pointermove`, 250, 75))
    expect(on_resize).toHaveBeenCalledTimes(1)
    expect(on_resize).toHaveBeenCalledWith(expect.any(PointerEvent), {
      width: 255,
      height: 150,
    })

    // End resize
    globalThis.dispatchEvent(pointer_event(`pointerup`, 0, 0))
    expect(document.body.style.userSelect).toBe(``)
    expect(on_resize_end).toHaveBeenCalledTimes(1)
    expect(on_resize_end).toHaveBeenCalledWith(
      expect.any(PointerEvent),
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
    `handles a %s edge resize with position adjustment`,
    (
      _edge,
      rect,
      [start_client_x, start_client_y],
      [drag_client_x, drag_client_y],
      expected_styles,
    ) => {
      const element = create_box(rect)
      resizable({ edges: [_edge] })(element)

      element.dispatchEvent(pointer_event(`pointerdown`, start_client_x, start_client_y))
      globalThis.dispatchEvent(pointer_event(`pointermove`, drag_client_x, drag_client_y))

      for (const [property, value] of Object.entries(expected_styles)) {
        expect(element.style.getPropertyValue(property)).toBe(value)
      }

      globalThis.dispatchEvent(pointer_event(`pointerup`, 0, 0))
    },
  )

  it(`does nothing when disabled`, () => {
    const element = create_box()
    const on_resize_start = vi.fn()
    const cleanup = resizable({ disabled: true, on_resize_start })(element)

    expect(cleanup).toBeUndefined()
    expect(element.style.position).toBe(``) // disabled skips the position: relative fixup

    element.dispatchEvent(pointer_event(`pointermove`, 195, 75)) // edge hover sets no cursor
    expect(element.style.cursor).toBe(``)
    element.dispatchEvent(pointer_event(`pointerdown`, 195, 75))
    globalThis.dispatchEvent(pointer_event(`pointermove`, 250, 75))
    expect(on_resize_start).not.toHaveBeenCalled()
    expect(element.style.width).toBe(`200px`) // untouched from create_element
  })

  it.each([
    [`width`, { min_width: 300, max_width: 100 }],
    [`height`, { min_height: 300, max_height: 100 }],
  ] as const)(`warns and skips invalid %s constraints`, (_dimension, options) => {
    const element = create_box()
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
    const element = create_box()
    element.style.position = initial_position

    resizable()(element)

    expect(element.style.position).toBe(expected_position)
  })

  it(`resets body userSelect when cleaned up mid-resize`, () => {
    const element = create_box()
    const on_resize = vi.fn()

    const cleanup = resizable({ on_resize })(element)
    element.dispatchEvent(pointer_event(`pointermove`, 195, 75))
    element.dispatchEvent(pointer_event(`pointerdown`, 195, 75))
    expect(document.body.style.userSelect).toBe(`none`)
    expect(element.style.cursor).toBe(`ew-resize`)

    cleanup?.() // unmount mid-resize, before any release
    expect(document.body.style.userSelect).toBe(``)
    expect(element.style.cursor).toBe(``)

    globalThis.dispatchEvent(pointer_event(`pointermove`, 250, 75))
    expect(on_resize).not.toHaveBeenCalled()
  })
})

describe(`float`, () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })

  // anchor as a bare rect, so no element geometry has to be mocked for the anchor
  const anchor_rect = { top: 100, bottom: 140, left: 60, right: 200 }

  const attach_float = (options: Parameters<typeof float>[0] = {}) => {
    const node = create_element()
    mock_rect(node, { left: 0, top: 0, width: 50, height: 20 })
    const cleanup = float({ anchor: anchor_rect, ...options })(node)
    if (cleanup) cleanups.push(cleanup)
    return node
  }

  it.each([
    [`fixed`, `fixed`, 0, 0],
    // absolute is measured against the document, so page scroll has to be added back
    [`absolute`, `absolute`, 400, 700],
  ] as const)(
    `%s strategy positions relative to the right origin`,
    (_desc, strategy, scroll_x, scroll_y) => {
      cleanups.push(stub_prop(globalThis, `scrollX`, scroll_x))
      cleanups.push(stub_prop(globalThis, `scrollY`, scroll_y))

      const node = attach_float({ strategy, placement: `bottom`, align: `start` })

      expect(node.style.position).toBe(strategy)
      // bottom placement sits below the anchor, start aligns the left edges
      expect(node.style.top).toBe(`${140 + scroll_y}px`)
      expect(node.style.left).toBe(`${60 + scroll_x}px`)
    },
  )

  it(`match_width sizes the surface to the anchor`, () => {
    expect(attach_float({ match_width: true }).style.width).toBe(`140px`) // 200 - 60
    expect(attach_float().style.width).toBe(``)
  })

  it(`records the resolved placement and repositions on scroll`, () => {
    const node = attach_float({ placement: `bottom` })
    expect(node.dataset.placement).toBe(`bottom`)

    node.style.top = `0px`
    globalThis.dispatchEvent(new Event(`scroll`))
    expect(node.style.top).toBe(`140px`)
  })

  it.each([
    [`disabled`, { enabled: false }],
    [`no anchor`, { anchor: null }],
  ] as const)(`%s attaches nothing`, (_desc, options) => {
    const node = create_element()
    expect(float({ anchor: anchor_rect, ...options })(node)).toBeUndefined()
    expect(node.style.position).toBe(``)
  })
})

describe(`portal`, () => {
  // home has siblings on both sides, so restoring to the wrong index is visible
  const setup = () => {
    const home = create_element()
    const target = create_element()
    const [before, node, after] = [
      document.createElement(`i`),
      document.createElement(`b`),
      document.createElement(`u`),
    ]
    home.append(before, node, after)
    return { home, target, node }
  }

  it(`moves the node into the target and restores its position on teardown`, () => {
    const { home, target, node } = setup()

    const cleanup = portal(target)(node)

    expect(node.parentElement).toBe(target)
    expect(home.innerHTML).toBe(`<i></i><!--portal--><u></u>`) // anchor holds the spot

    cleanup?.()
    expect(node.parentElement).toBe(home)
    expect(home.innerHTML).toBe(`<i></i><b></b><u></u>`) // back between its siblings
    expect(target.childNodes).toHaveLength(0)
  })

  it(`restores between siblings added while it was away`, () => {
    const { home, target, node } = setup()
    const cleanup = portal(target)(node)

    home.append(document.createElement(`s`))
    cleanup?.()

    expect(home.innerHTML).toBe(`<i></i><b></b><u></u><s></s>`)
  })

  it.each([`null`, `undefined`, `already the parent`] as const)(
    `a %s target leaves the node where it is`,
    (kind) => {
      const { home, node } = setup()
      const target = { null: null, undefined, 'already the parent': home }[kind]

      expect(portal(target)(node)).toBeUndefined()
      expect(node.parentElement).toBe(home)
      expect(home.innerHTML).toBe(`<i></i><b></b><u></u>`) // not re-appended after <u>
    },
  )

  it(`removes the node instead of stranding it when its anchor is gone`, () => {
    const { home, target, node } = setup()
    const cleanup = portal(target)(node)

    home.innerHTML = `` // the block that owned the node tore its markup down
    cleanup?.()

    expect(node.parentElement).toBeNull()
    expect(target.childNodes).toHaveLength(0)
  })

  it(`restores into a detached home rather than dropping the node`, () => {
    const { home, target, node } = setup()
    const cleanup = portal(target)(node)

    home.remove() // whole subtree detached, anchor still marks the spot inside it
    cleanup?.()

    expect(node.parentElement).toBe(home)
    expect(target.childNodes).toHaveLength(0)
  })
})

describe(`contrast_color`, () => {
  // brackets a color's luminance from both sides: a threshold just below it has to read
  // as `over` and one just above as `under`, which pins the value without exposing it
  const luminance_brackets = (bg_color: string, expected: number, tolerance: number) => {
    const probe = (luminance_threshold: number) =>
      pick_contrast_color({ bg_color, luminance_threshold, choices: [`over`, `under`] })
    return [probe(expected - tolerance), probe(expected + tolerance)]
  }
  const bracketed = [`over`, `under`]

  it.each([
    [`light rgb background`, `rgb(255, 255, 255)`, `black`],
    [`dark rgb background`, `rgb(20, 20, 20)`, `white`],
    [`space-separated rgb`, `rgb(255 255 255)`, `black`],
    [`rgba with alpha`, `rgba(10, 10, 10, 0.9)`, `white`],
    [`six-digit hex`, `#ffffff`, `black`],
    [`three-digit hex`, `#111`, `white`],
    [`eight-digit hex`, `#ffffffcc`, `black`],
    // computed styles keep a color in the space it was authored in, so these arrive
    // at get_bg_color verbatim rather than pre-converted to rgb()
    [`white oklch`, `oklch(1 0 0)`, `black`],
    [`black oklab`, `oklab(0 0 0)`, `white`],
    [`red oklch`, `oklch(0.627955 0.257683 29.2338)`, `white`],
    [`white lab`, `lab(100 0 0)`, `black`],
    [`red lch`, `lch(54.291 106.837 40.853)`, `white`],
    [`white display-p3`, `color(display-p3 1 1 1)`, `black`],
    [`black srgb`, `color(srgb 0 0 0)`, `white`],
    [`white rec2020`, `color(rec2020 1 1 1)`, `black`],
    [`white xyz`, `color(xyz 0.9505 1 1.089)`, `black`],
    [`red hsl`, `hsl(0 100% 50%)`, `white`],
    [`white hwb`, `hwb(0 100% 0%)`, `black`],
  ])(`picks contrast text for a %s`, (_desc, bg_color, expected) => {
    expect(pick_contrast_color({ bg_color })).toBe(expected)
  })

  // the conversions are only worth anything if they land on the same luminance the
  // equivalent sRGB spelling does, so each pair has to agree either side of a threshold
  // set at the reference color's own luminance
  it.each([
    [`oklab(0.627955 0.224863 0.125846)`, 0.299],
    [`oklch(62.7955% 0.257683 29.2338deg)`, 0.299],
    [`lab(54.291 80.805 69.891)`, 0.299],
    [`color(srgb 1 0 0)`, 0.299],
    [`color(display-p3 1 0 0)`, 0.299], // p3 red is out of sRGB gamut and clips to red
    [`color(prophoto-rgb 1 1 1)`, 1],
    [`color(a98-rgb 1 1 1)`, 1],
    [`color(srgb-linear 1 1 1)`, 1],
    [`color(xyz-d50 0.9643 1 0.8251)`, 1],
    [`hwb(0.5turn 0% 0%)`, 0.701], // cyan
    // same cyan a third way: 200grad is 180deg, and `grad` must not read as the `rad`
    // it ends with, which would leave a trailing `g` and parse to NaN
    [`hwb(200grad 0% 0%)`, 0.701],
    [`oklch(0.627955 0.257683 0.51022606rad)`, 0.299], // red, the 29.2338deg above in radians
    // percentages are as legal in rgb() as anywhere else, in channels and alpha alike
    [`rgb(100% 0% 0%)`, 0.299],
    [`rgb(0 0 0 / 50%)`, 0],
    [`rgba(255, 255, 255, 50%)`, 1],
    [`hwb(0 25% 25%)`, 0.3995], // white and black both mixed into the pure hue
    [`hsla(0, 100%, 50%, 0.5)`, 0.299],
  ])(`%s converts to a luminance of %f`, (bg_color, expected) => {
    expect(luminance_brackets(bg_color, expected, 1e-4)).toEqual(bracketed)
  })

  // The cases above are all primaries or pure white, which every space maps to the same
  // corner of sRGB — they pass whatever the conversion matrices hold. These are mid-gamut,
  // where the coefficients actually decide the answer, and the expected channels are what
  // Chrome 144 paints for the same string (canvas fillStyle, then getImageData).
  // Chrome quantizes to 8-bit, so its answer is only good to half a channel: 0.5/255 is
  // 1.96e-3 of luminance, and the tolerance is that bound. Every wrong-matrix result
  // checked (skipping the D50 adaptation above all) misses by far more than this.
  it.each([
    [`oklch(0.7 0.15 30)`, [237, 118, 101]],
    [`oklab(0.35 0.08 -0.12)`, [75, 28, 118]],
    [`lab(50 40 -30)`, [165, 91, 171]],
    [`lch(60 50 300)`, [157, 131, 222]],
    [`hsl(200 60% 40%)`, [41, 122, 163]],
    [`hwb(45 60% 10%)`, [230, 210, 153]],
    [`color(srgb-linear 0.5 0.5 0.5)`, [188, 188, 188]],
    [`color(display-p3 0.8 0.2 0.4)`, [222, 24, 101]],
    [`color(a98-rgb 0.5 0.5 0.2)`, [128, 128, 40]],
    [`color(prophoto-rgb 0.4 0.7 0.3)`, [0, 204, 64]],
    [`color(rec2020 0.6 0.3 0.8)`, [187, 74, 218]],
    [`color(xyz-d50 0.3 0.4 0.2)`, [122, 184, 127]],
    [`color(xyz-d65 0.3 0.4 0.2)`, [139, 182, 107]],
  ])(`%s lands where Chrome paints it`, (bg_color, [red, green, blue]) => {
    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
    expect(luminance_brackets(bg_color, luminance, 2e-3)).toEqual(bracketed)
  })

  // Perceived brightness weights green ×0.587, red ×0.299 and blue ×0.114, so the
  // same channel value reads very differently. A plain channel average would land
  // all three of these on 0.333 and give one answer for the lot.
  it.each([
    [`green`, `rgb(0, 255, 0)`, `black`],
    [`red`, `rgb(255, 0, 0)`, `white`],
    [`blue`, `rgb(0, 0, 255)`, `white`],
  ])(`weighs channels perceptually: full %s`, (_desc, bg_color, expected) => {
    expect(pick_contrast_color({ bg_color, luminance_threshold: 0.5 })).toBe(expected)
  })

  it.each<[string, ContrastOptions, string]>([
    [`custom choices`, { bg_color: `#000`, choices: [`#222`, `#eee`] }, `#eee`],
    // white's luminance is 1, so a threshold above it flips even white to dark text
    [`custom threshold`, { bg_color: `#fff`, luminance_threshold: 1.5 }, `white`],
    [`empty bg treated as a white page`, { bg_color: `` }, `black`],
    [`no bg treated as a white page`, {}, `black`],
  ])(`honors %s`, (_desc, options, expected) => {
    expect(pick_contrast_color(options)).toBe(expected)
  })

  // named colors and color-mix() stay out: a computed value can carry neither, since
  // color-mix() resolves to a color in its interpolation space before it is read back
  it.each([
    `red`,
    `color-mix(in oklab, red, blue)`,
    `color(not-a-space 1 1 1)`,
    // Object.prototype keys are not color spaces: a bare lookup finds `constructor`
    `color(constructor 1 1 1)`,
    `color(srgb 1 1)`,
    `oklch(0.7 0.1)`,
    `#12345`,
    `rgb(1, 2)`,
    `rgb(a, b, c)`,
  ])(`throws on the unparsable color %s`, (bg_color) => {
    expect(() => pick_contrast_color({ bg_color })).toThrow(/cannot read color/u)
  })

  // a chain with nothing painted in it reports no background at all, and a page with
  // nothing behind the node is assumed white
  it.each([
    [`the first painted ancestor`, `rgb(10, 10, 10)`, `rgb(10, 10, 10)`, `white`],
    [`nothing when every ancestor is transparent`, `rgba(0, 0, 0, 0)`, ``, `black`],
  ])(`the ancestor walk finds %s`, (_desc, background, expected_bg, expected_color) => {
    const painted = create_element(`div`, { backgroundColor: background })
    const middle = document.createElement(`div`)
    const node = document.createElement(`span`)
    painted.append(middle)
    middle.append(node)

    expect(get_bg_color(node)).toBe(expected_bg)
    const cleanup = contrast_color()(node)
    expect(node.style.color).toBe(expected_color)
    cleanup?.()
  })

  // the ancestor walk stops at the first painted background, and a wide-gamut one is
  // painted: reading only rgb()/rgba() used to skip straight past it
  it.each([
    [`oklch(0.3 0.1 200)`, `white`, true],
    [`oklch(0.3 0.1 200 / 0)`, `black`, false],
    [`rgb(0 0 0 / 0%)`, `black`, false], // a percentage alpha reads as transparent too
    [`color(display-p3 1 1 1)`, `black`, true],
  ])(`sees %s as a painted ancestor: %s`, (background, expected_color, painted) => {
    const ancestor = document.createElement(`div`)
    const node = document.createElement(`span`)
    ancestor.append(node)
    document.body.append(ancestor)
    vi.spyOn(globalThis, `getComputedStyle`).mockImplementation(
      (element) =>
        ({
          backgroundColor: element === ancestor ? background : `rgba(0, 0, 0, 0)`,
        }) as CSSStyleDeclaration,
    )

    expect(get_bg_color(node)).toBe(painted ? background : ``)
    const cleanup = contrast_color()(node)
    expect(node.style.color).toBe(expected_color)
    cleanup?.()
  })

  it(`bg_color skips the ancestor walk and cleanup restores the inline color`, () => {
    const node = create_element(`div`, {
      backgroundColor: `rgb(255, 255, 255)`,
      color: `rebeccapurple`,
    })

    const cleanup = contrast_color({ bg_color: `rgb(0, 0, 0)` })(node)
    expect(node.style.color).toBe(`white`) // the ancestor white would have said black

    cleanup?.()
    expect(node.style.color).toBe(`rebeccapurple`)
  })
})

describe(`forward_window_keydown`, () => {
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
    document.body.innerHTML = ``
  })

  const attach = (handled = true, options: { enabled?: boolean } = {}) => {
    const node = create_element()
    const handle = vi.fn(() => handled)
    const cleanup = forward_window_keydown({ handle, ...options })(node)
    if (cleanup) cleanups.push(cleanup)
    return { node, handle, cleanup }
  }

  const hover = (node: Element) =>
    node.dispatchEvent(new PointerEvent(`pointerenter`, { bubbles: false }))
  const unhover = (node: Element) =>
    node.dispatchEvent(new PointerEvent(`pointerleave`, { bubbles: false }))
  const press_key = (key = `f`) => {
    const event = new KeyboardEvent(`keydown`, { key, bubbles: true, cancelable: true })
    globalThis.dispatchEvent(event)
    return event
  }

  it(`forwards only while hovered, and never once cleaned up`, () => {
    const { node, handle, cleanup } = attach()

    press_key()
    expect(handle).not.toHaveBeenCalled() // never hovered, so this key is not ours

    hover(node)
    press_key()
    expect(handle).toHaveBeenCalledTimes(1)

    unhover(node)
    press_key()
    expect(handle).toHaveBeenCalledTimes(1)

    hover(node) // hovered again, but the listener is gone
    cleanup?.()
    press_key()
    expect(handle).toHaveBeenCalledTimes(1)
  })

  it(`two hovered-by-turns components never both answer one key`, () => {
    const first = attach()
    const second = attach()

    hover(first.node)
    press_key()
    expect(first.handle).toHaveBeenCalledTimes(1)
    expect(second.handle).not.toHaveBeenCalled()

    unhover(first.node)
    hover(second.node)
    press_key()
    expect(first.handle).toHaveBeenCalledTimes(1)
    expect(second.handle).toHaveBeenCalledTimes(1)
  })

  it(`leaves keys to a focused input even while hovered`, () => {
    const { node, handle } = attach()
    hover(node)
    const input = document.createElement(`input`)
    document.body.append(input)
    input.focus()

    press_key()
    expect(handle).not.toHaveBeenCalled()

    input.blur() // focus falls back to body, so hover decides again
    press_key()
    expect(handle).toHaveBeenCalledTimes(1)
  })

  it.each([
    [`suppresses the browser default when handled`, true, true],
    [`leaves the default alone when unhandled`, false, false],
  ])(`%s`, (_desc, handled, expected_prevented) => {
    const { node } = attach(handled)
    hover(node)

    expect(press_key().defaultPrevented).toBe(expected_prevented)
  })

  it(`disabled attaches nothing`, () => {
    const { node, handle, cleanup } = attach(true, { enabled: false })

    expect(cleanup).toBeUndefined()
    hover(node)
    press_key()
    expect(handle).not.toHaveBeenCalled()
  })
})
