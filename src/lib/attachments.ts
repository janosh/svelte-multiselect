import { type Attachment } from 'svelte/attachments'

// Type definitions for CSS highlight API (experimental)
declare global {
  interface CSS {
    highlights: HighlightRegistry
  }
  interface HighlightRegistry extends Map<string, Highlight> {
    clear(): void
    delete(key: string): boolean
    set(key: string, value: Highlight): this
  }
}

export interface DraggableOptions {
  handle_selector?: string
  disabled?: boolean
  on_drag_start?: (event: MouseEvent) => void
  on_drag?: (event: MouseEvent) => void
  on_drag_end?: (event: MouseEvent) => void
}

export type Dimensions = { width: number; height: number }
export type ResizeCallback = (event: MouseEvent, dimensions: Dimensions) => void

export interface ResizableOptions {
  edges?: (`top` | `right` | `bottom` | `left`)[]
  min_width?: number
  min_height?: number
  max_width?: number
  max_height?: number
  handle_size?: number // px, default 8
  disabled?: boolean
  on_resize_start?: ResizeCallback
  on_resize?: ResizeCallback
  on_resize_end?: ResizeCallback
}

// Svelte 5 attachment factory to make an element draggable
// @param options - Configuration options for dragging behavior
// @returns Attachment function that sets up dragging on an element
export const draggable =
  (options: DraggableOptions = {}): Attachment => (element: Element) => {
    if (options.disabled) return

    const node = element as HTMLElement

    // Use simple variables for maximum performance
    let dragging = false
    let start = { x: 0, y: 0 }
    const initial = { left: 0, top: 0 }

    const handle = options.handle_selector
      ? node.querySelector<HTMLElement>(options.handle_selector)
      : node

    if (!handle) {
      console.warn(
        `Draggable: handle not found with selector "${options.handle_selector}"`,
      )
      return
    }

    function handle_mousedown(event: MouseEvent) {
      // Only drag if mousedown is on the handle or its children
      if (!handle?.contains?.(event.target as Node)) return

      dragging = true

      // For position: fixed elements, use getBoundingClientRect for viewport-relative position
      const computed_style = getComputedStyle(node)
      if (computed_style.position === `fixed`) {
        const rect = node.getBoundingClientRect()
        initial.left = rect.left
        initial.top = rect.top
      } else {
        // For other positioning, use offset values
        initial.left = node.offsetLeft
        initial.top = node.offsetTop
      }

      node.style.left = `${initial.left}px`
      node.style.top = `${initial.top}px`
      node.style.right = `auto` // Prevent conflict with left
      start = { x: event.clientX, y: event.clientY }
      document.body.style.userSelect = `none` // Prevent text selection during drag
      if (handle) handle.style.cursor = `grabbing`

      globalThis.addEventListener(`mousemove`, handle_mousemove)
      globalThis.addEventListener(`mouseup`, handle_mouseup)

      options.on_drag_start?.(event) // Call optional callback
    }

    function handle_mousemove(event: MouseEvent) {
      if (!dragging) return

      // Use the exact same calculation as the fast old implementation
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      node.style.left = `${initial.left + dx}px`
      node.style.top = `${initial.top + dy}px`

      // Only call callback if it exists (minimize overhead)
      if (options.on_drag) options.on_drag(event)
    }

    function handle_mouseup(event: MouseEvent) {
      if (!dragging) return

      dragging = false
      event.stopPropagation()
      document.body.style.userSelect = ``
      if (handle) handle.style.cursor = `grab`

      globalThis.removeEventListener(`mousemove`, handle_mousemove)
      globalThis.removeEventListener(`mouseup`, handle_mouseup)

      options.on_drag_end?.(event) // Call optional callback
    }

    if (handle) {
      handle.addEventListener(`mousedown`, handle_mousedown)
      handle.style.cursor = `grab`
    }

    // Return cleanup function (this is the attachment pattern)
    return () => {
      globalThis.removeEventListener(`mousemove`, handle_mousemove)
      globalThis.removeEventListener(`mouseup`, handle_mouseup)
      if (handle) {
        handle.removeEventListener(`mousedown`, handle_mousedown)
        handle.style.cursor = `` // Reset cursor
      }
    }
  }

// Automatically sets `position: relative` on elements with `position: static`
// to enable proper positioning during resize. This may affect existing layouts.
export const resizable =
  (options: ResizableOptions = {}): Attachment => (element: Element) => {
    if (options.disabled) return

    const node = element as HTMLElement
    const {
      edges = [`right`, `bottom`],
      min_width = 50,
      min_height = 50,
      max_width = Infinity,
      max_height = Infinity,
      handle_size = 8,
      on_resize_start,
      on_resize,
      on_resize_end,
    } = options

    if (min_width > max_width || min_height > max_height) {
      console.warn(
        `resizable: min dimensions exceed max dimensions (min_width=${min_width}, max_width=${max_width}, min_height=${min_height}, max_height=${max_height})`,
      )
      return // Invalid config would cause clamp() to produce inconsistent results
    }

    let active_edge: string | null = null
    let start = { x: 0, y: 0 }
    let initial = { width: 0, height: 0, left: 0, top: 0 }

    const clamp = (val: number, min: number, max: number) =>
      Math.max(min, Math.min(max, val))

    if (getComputedStyle(node).position === `static`) node.style.position = `relative`

    const get_edge = ({ clientX: cx, clientY: cy }: MouseEvent): string | null => {
      const { left, right, top, bottom } = node.getBoundingClientRect()
      if (edges.includes(`right`) && cx >= right - handle_size && cx <= right) {
        return `right`
      }
      if (edges.includes(`bottom`) && cy >= bottom - handle_size && cy <= bottom) {
        return `bottom`
      }
      if (edges.includes(`left`) && cx >= left && cx <= left + handle_size) return `left`
      if (edges.includes(`top`) && cy >= top && cy <= top + handle_size) return `top`
      return null
    }

    function on_mousedown(event: MouseEvent) {
      active_edge = get_edge(event)
      if (!active_edge) return

      start = { x: event.clientX, y: event.clientY }
      initial = {
        width: node.offsetWidth,
        height: node.offsetHeight,
        left: node.offsetLeft,
        top: node.offsetTop,
      }
      document.body.style.userSelect = `none`
      on_resize_start?.(event, { width: initial.width, height: initial.height })
      globalThis.addEventListener(`mousemove`, on_mousemove)
      globalThis.addEventListener(`mouseup`, on_mouseup)
    }

    function on_mousemove(event: MouseEvent) {
      if (!active_edge) return

      const dx = event.clientX - start.x, dy = event.clientY - start.y
      let { width, height } = initial

      if (active_edge === `right`) width = clamp(initial.width + dx, min_width, max_width)
      else if (active_edge === `left`) {
        const clamped = clamp(initial.width - dx, min_width, max_width)
        node.style.left = `${initial.left - (clamped - initial.width)}px`
        width = clamped
      }

      if (active_edge === `bottom`) {
        height = clamp(initial.height + dy, min_height, max_height)
      } else if (active_edge === `top`) {
        const clamped = clamp(initial.height - dy, min_height, max_height)
        node.style.top = `${initial.top - (clamped - initial.height)}px`
        height = clamped
      }

      node.style.width = `${width}px`
      node.style.height = `${height}px`
      on_resize?.(event, { width, height })
    }

    function on_mouseup(event: MouseEvent) {
      if (!active_edge) return
      document.body.style.userSelect = ``
      on_resize_end?.(event, { width: node.offsetWidth, height: node.offsetHeight })
      globalThis.removeEventListener(`mousemove`, on_mousemove)
      globalThis.removeEventListener(`mouseup`, on_mouseup)
      active_edge = null
    }

    function on_hover(event: MouseEvent) {
      const edge = get_edge(event)
      node.style.cursor = edge === `right` || edge === `left`
        ? `ew-resize`
        : edge === `top` || edge === `bottom`
        ? `ns-resize`
        : ``
    }

    node.addEventListener(`mousedown`, on_mousedown)
    node.addEventListener(`mousemove`, on_hover)

    return () => {
      node.removeEventListener(`mousedown`, on_mousedown)
      node.removeEventListener(`mousemove`, on_hover)
      globalThis.removeEventListener(`mousemove`, on_mousemove)
      globalThis.removeEventListener(`mouseup`, on_mouseup)
      node.style.cursor = ``
    }
  }

export function get_html_sort_value(element: HTMLElement): string {
  if (element.dataset.sortValue !== undefined) {
    return element.dataset.sortValue
  }
  for (const child of Array.from(element.children)) {
    const child_val = get_html_sort_value(child as HTMLElement)
    if (child_val !== ``) return child_val
  }
  return element.textContent ?? ``
}

export interface SortableOptions {
  header_selector?: string
  asc_class?: string
  desc_class?: string
  sorted_style?: Partial<CSSStyleDeclaration>
  disabled?: boolean
}

export const sortable = (options: SortableOptions = {}) => (node: HTMLElement) => {
  const {
    header_selector = `thead th`,
    asc_class = `table-sort-asc`,
    desc_class = `table-sort-desc`,
    sorted_style = { backgroundColor: `rgba(255, 255, 255, 0.1)` },
    disabled = false,
  } = options

  if (disabled) return

  // This action can be applied to standard HTML tables to make them sortable by
  // clicking on column headers (and clicking again to toggle sorting direction)
  const headers = Array.from(node.querySelectorAll<HTMLTableCellElement>(header_selector))
  let sort_col_idx: number
  let sort_dir = 1 // 1 = asc, -1 = desc

  // Store original state for cleanup
  const header_state: {
    header: HTMLTableCellElement
    handler: () => void
    original_text: string
    original_style: string
  }[] = []

  for (const [idx, header] of headers.entries()) {
    const original_text = header.textContent ?? ``
    const original_style = header.getAttribute(`style`) ?? ``
    header.style.cursor = `pointer` // add cursor pointer to headers

    const click_handler = () => {
      // reset all headers to unsorted state
      for (const { header: hdr, original_text, original_style } of header_state) {
        hdr.textContent = original_text
        hdr.classList.remove(asc_class, desc_class)
        if (original_style) {
          hdr.setAttribute(`style`, original_style)
        } else {
          hdr.removeAttribute(`style`)
        }
        hdr.style.cursor = `pointer`
      }
      if (idx === sort_col_idx) {
        sort_dir *= -1 // reverse sort direction
      } else {
        sort_col_idx = idx // set new sort column index
        sort_dir = 1 // reset sort direction
      }
      header.classList.add(sort_dir > 0 ? asc_class : desc_class)
      Object.assign(header.style, sorted_style)
      header.textContent = `${header.textContent?.replace(/ ↑| ↓/, ``)} ${
        sort_dir > 0 ? `↑` : `↓`
      }`

      const table_body = node.querySelector(`tbody`)
      if (!table_body) return

      // re-sort table
      const rows = Array.from(table_body.querySelectorAll(`tr`))
      rows.sort((row_1, row_2) => {
        const cell_1 = row_1.cells[sort_col_idx]
        const cell_2 = row_2.cells[sort_col_idx]
        const val_1 = get_html_sort_value(cell_1)
        const val_2 = get_html_sort_value(cell_2)

        if (val_1 === val_2) return 0
        if (val_1 === ``) return 1 // treat empty string as lower than any value
        if (val_2 === ``) return -1 // any value is considered higher than empty string

        const num_1 = Number(val_1)
        const num_2 = Number(val_2)

        if (isNaN(num_1) && isNaN(num_2)) {
          return sort_dir * val_1.localeCompare(val_2, undefined, { numeric: true })
        }
        return sort_dir * (num_1 - num_2)
      })

      for (const row of rows) table_body.appendChild(row)
    }

    header.addEventListener(`click`, click_handler)
    header_state.push({ header, handler: click_handler, original_text, original_style })
  }

  // Return cleanup function that fully restores original state
  return () => {
    for (const { header, handler, original_text, original_style } of header_state) {
      header.removeEventListener(`click`, handler)
      header.textContent = original_text
      header.classList.remove(asc_class, desc_class)
      if (original_style) {
        header.setAttribute(`style`, original_style)
      } else {
        header.removeAttribute(`style`)
      }
    }
  }
}

export type HighlightOptions = {
  query?: string
  disabled?: boolean
  fuzzy?: boolean
  node_filter?: (node: Node) => number
  css_class?: string
}

export const highlight_matches = (ops: HighlightOptions) => (node: HTMLElement) => {
  const {
    query = ``,
    disabled = false,
    fuzzy = false,
    node_filter = () => NodeFilter.FILTER_ACCEPT,
    css_class = `highlight-match`,
  } = ops

  // abort if CSS highlight API not supported
  if (typeof CSS === `undefined` || !CSS.highlights) return
  // always clear our own highlight first
  CSS.highlights.delete(css_class)
  // if disabled or empty query, stop after cleanup
  if (!query || disabled) return

  const tree_walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: node_filter,
  })
  const text_nodes: Node[] = []
  let current_node = tree_walker.nextNode()

  while (current_node) {
    text_nodes.push(current_node)
    current_node = tree_walker.nextNode()
  }

  // iterate over all text nodes and find matches
  const ranges = text_nodes.map((el) => {
    const text = el.textContent?.toLowerCase()
    if (!text) return []

    const search = query.toLowerCase()

    if (fuzzy) {
      // Fuzzy highlighting: highlight individual characters that match in order
      const matching_indices: number[] = []

      let search_idx = 0
      let target_idx = 0

      // Find matching character indices
      while (search_idx < search.length && target_idx < text.length) {
        if (search[search_idx] === text[target_idx]) {
          matching_indices.push(target_idx)
          search_idx++
        }
        target_idx++
      }

      // Only create ranges if we found all characters in order
      if (search_idx === search.length) {
        return matching_indices.map((index) => {
          const range = new Range()
          range.setStart(el, index)
          range.setEnd(el, index + 1) // highlight single character
          return range
        })
      }

      return []
    } else {
      // Substring highlighting: highlight consecutive substrings
      const indices = []
      let start_pos = 0
      while (start_pos < text.length) {
        const index = text.indexOf(search, start_pos)
        if (index === -1) break
        indices.push(index)
        start_pos = index + search.length
      }

      // create range object for each substring found in the text node
      return indices.map((index) => {
        const range = new Range()
        range.setStart(el, index)
        range.setEnd(el, index + search.length)
        return range
      })
    }
  })

  // create Highlight object from ranges and add to registry
  CSS.highlights.set(css_class, new Highlight(...ranges.flat()))

  // Return cleanup function
  return () => CSS.highlights.delete(css_class)
}

// Global tooltip state to ensure only one tooltip is shown at a time
let current_tooltip: (HTMLElement & { _owner?: HTMLElement }) | null = null
let show_timeout: ReturnType<typeof setTimeout> | undefined
let hide_timeout: ReturnType<typeof setTimeout> | undefined

function clear_tooltip() {
  if (show_timeout) clearTimeout(show_timeout)
  if (hide_timeout) clearTimeout(hide_timeout)
  if (current_tooltip) {
    current_tooltip.remove()
    current_tooltip = null
  }
}

// Options for the tooltip attachment.
// Security: content is rendered as HTML. If allowing user-provided content
// to be set via `title`, `aria-label`, or `data-title` attributes, you MUST sanitize
// to prevent XSS attacks. This attachment does not perform any sanitization.
export interface TooltipOptions {
  content?: string
  placement?: `top` | `bottom` | `left` | `right`
  delay?: number
  disabled?: boolean
  style?: string
}

export const tooltip = (options: TooltipOptions = {}): Attachment => (node: Element) => {
  // Handle null/undefined elements
  if (!node || !(node instanceof HTMLElement)) return

  // Handle null/undefined options
  const safe_options = options || {}
  const cleanup_functions: (() => void)[] = []

  function setup_tooltip(element: HTMLElement) {
    if (!element || safe_options.disabled) return

    // Use let so content can be updated reactively
    let content = safe_options.content || element.title ||
      element.getAttribute(`aria-label`) || element.getAttribute(`data-title`)
    if (!content) return

    // Store original title and remove it to prevent default tooltip
    // Only store title if we're not using custom content
    if (element.title && !safe_options.content) {
      element.setAttribute(`data-original-title`, element.title)
      element.removeAttribute(`title`)
    }

    // Reactively update content when tooltip attributes change
    const tooltip_attrs = [`title`, `aria-label`, `data-title`]
    const observer = new MutationObserver((mutations) => {
      if (safe_options.content) return // custom content takes precedence
      for (const { type, attributeName } of mutations) {
        if (type !== `attributes` || !attributeName) continue
        const new_content = element.getAttribute(attributeName)
        // null = attribute removed (by us), skip entirely
        if (new_content === null) continue
        // Always remove title to prevent browser's native tooltip (even if empty)
        // Disconnect observer temporarily to avoid re-entrancy from our own removal
        if (attributeName === `title`) {
          observer.disconnect()
          element.removeAttribute(`title`)
          observer.observe(element, { attributes: true, attributeFilter: tooltip_attrs })
        }
        // Only update content if non-empty
        if (!new_content) continue
        content = new_content
        // Only update tooltip if this element owns it
        if (current_tooltip?._owner === element) {
          current_tooltip.innerHTML = content.replace(/\r/g, `<br/>`)
        }
      }
    })
    observer.observe(element, { attributes: true, attributeFilter: tooltip_attrs })

    function show_tooltip() {
      clear_tooltip()

      show_timeout = setTimeout(() => {
        const tooltip = document.createElement(`div`)
        tooltip.className = `custom-tooltip`
        const placement = safe_options.placement || `bottom`
        tooltip.setAttribute(`data-placement`, placement)
        // Apply base styles
        tooltip.style.cssText = `
          position: absolute; z-index: 9999; opacity: 0;
          background: var(--tooltip-bg, #333); color: var(--text-color, white); border: var(--tooltip-border, none);
          padding: var(--tooltip-padding, 6px 10px); border-radius: var(--tooltip-radius, 6px); font-size: var(--tooltip-font-size, 13px); line-height: 1.4;
          max-width: var(--tooltip-max-width, 280px); word-wrap: break-word; text-wrap: balance; pointer-events: none;
          filter: var(--tooltip-shadow, drop-shadow(0 2px 8px rgba(0,0,0,0.25))); transition: opacity 0.15s ease-out;
        `

        // Apply custom styles if provided (these will override base styles due to CSS specificity)
        if (safe_options.style) {
          // Parse and apply custom styles as individual properties for better control
          const custom_styles = safe_options.style.split(`;`).filter((style) =>
            style.trim()
          )
          custom_styles.forEach((style) => {
            const [property, value] = style.split(`:`).map((s) => s.trim())
            if (property && value) tooltip.style.setProperty(property, value)
          })
        }

        tooltip.innerHTML = content?.replace(/\r/g, `<br/>`) ?? ``

        // Mirror CSS custom properties from the trigger node onto the tooltip element
        const trigger_styles = getComputedStyle(element)
        ;[
          `--tooltip-bg`,
          `--text-color`,
          `--tooltip-border`,
          `--tooltip-padding`,
          `--tooltip-radius`,
          `--tooltip-font-size`,
          `--tooltip-shadow`,
          `--tooltip-max-width`,
          `--tooltip-opacity`,
          `--tooltip-arrow-size`,
        ].forEach((name) => {
          const value = trigger_styles.getPropertyValue(name).trim()
          if (value) tooltip.style.setProperty(name, value)
        })

        // Append early so we can read computed border styles for arrow border
        document.body.appendChild(tooltip)

        // Arrow elements: optional border triangle behind fill triangle
        const tooltip_styles = getComputedStyle(tooltip)
        const arrow = document.createElement(`div`)
        arrow.className = `custom-tooltip-arrow`
        arrow.style.cssText =
          `position: absolute; width: 0; height: 0; pointer-events: none;`
        const arrow_size_raw = trigger_styles.getPropertyValue(`--tooltip-arrow-size`)
          .trim()
        const arrow_size_num = Number.parseInt(arrow_size_raw || ``, 10)
        const arrow_px = Number.isFinite(arrow_size_num) ? arrow_size_num : 6

        const border_color = tooltip_styles.borderTopColor
        const border_width_num = Number.parseFloat(tooltip_styles.borderTopWidth || `0`)
        const has_border = !!border_color && border_color !== `rgba(0, 0, 0, 0)` &&
          border_width_num > 0

        const maybe_append_border_arrow = () => {
          if (!has_border) return
          const border_arrow = document.createElement(`div`)
          border_arrow.className = `custom-tooltip-arrow-border`
          border_arrow.style.cssText =
            `position: absolute; width: 0; height: 0; pointer-events: none;`
          const border_size = arrow_px + (border_width_num * 1.4)
          if (placement === `top`) {
            border_arrow.style.left = `calc(50% - ${border_size}px)`
            border_arrow.style.bottom = `-${border_size}px`
            border_arrow.style.borderLeft = `${border_size}px solid transparent`
            border_arrow.style.borderRight = `${border_size}px solid transparent`
            border_arrow.style.borderTop = `${border_size}px solid ${border_color}`
          } else if (placement === `left`) {
            border_arrow.style.top = `calc(50% - ${border_size}px)`
            border_arrow.style.right = `-${border_size}px`
            border_arrow.style.borderTop = `${border_size}px solid transparent`
            border_arrow.style.borderBottom = `${border_size}px solid transparent`
            border_arrow.style.borderLeft = `${border_size}px solid ${border_color}`
          } else if (placement === `right`) {
            border_arrow.style.top = `calc(50% - ${border_size}px)`
            border_arrow.style.left = `-${border_size}px`
            border_arrow.style.borderTop = `${border_size}px solid transparent`
            border_arrow.style.borderBottom = `${border_size}px solid transparent`
            border_arrow.style.borderRight = `${border_size}px solid ${border_color}`
          } else { // bottom
            border_arrow.style.left = `calc(50% - ${border_size}px)`
            border_arrow.style.top = `-${border_size}px`
            border_arrow.style.borderLeft = `${border_size}px solid transparent`
            border_arrow.style.borderRight = `${border_size}px solid transparent`
            border_arrow.style.borderBottom = `${border_size}px solid ${border_color}`
          }
          tooltip.appendChild(border_arrow)
        }

        // Create the fill arrow on top
        if (placement === `top`) {
          arrow.style.left = `calc(50% - ${arrow_px}px)`
          arrow.style.bottom = `-${arrow_px}px`
          arrow.style.borderLeft = `${arrow_px}px solid transparent`
          arrow.style.borderRight = `${arrow_px}px solid transparent`
          arrow.style.borderTop = `${arrow_px}px solid var(--tooltip-bg, #333)`
        } else if (placement === `left`) {
          arrow.style.top = `calc(50% - ${arrow_px}px)`
          arrow.style.right = `-${arrow_px}px`
          arrow.style.borderTop = `${arrow_px}px solid transparent`
          arrow.style.borderBottom = `${arrow_px}px solid transparent`
          arrow.style.borderLeft = `${arrow_px}px solid var(--tooltip-bg, #333)`
        } else if (placement === `right`) {
          arrow.style.top = `calc(50% - ${arrow_px}px)`
          arrow.style.left = `-${arrow_px}px`
          arrow.style.borderTop = `${arrow_px}px solid transparent`
          arrow.style.borderBottom = `${arrow_px}px solid transparent`
          arrow.style.borderRight = `${arrow_px}px solid var(--tooltip-bg, #333)`
        } else { // bottom
          arrow.style.left = `calc(50% - ${arrow_px}px)`
          arrow.style.top = `-${arrow_px}px`
          arrow.style.borderLeft = `${arrow_px}px solid transparent`
          arrow.style.borderRight = `${arrow_px}px solid transparent`
          arrow.style.borderBottom = `${arrow_px}px solid var(--tooltip-bg, #333)`
        }
        maybe_append_border_arrow()
        tooltip.appendChild(arrow)

        // Position tooltip
        const rect = element.getBoundingClientRect()
        const tooltip_rect = tooltip.getBoundingClientRect()
        const margin = 12

        let top = 0, left = 0
        if (placement === `top`) {
          top = rect.top - tooltip_rect.height - margin
          left = rect.left + rect.width / 2 - tooltip_rect.width / 2
        } else if (placement === `left`) {
          top = rect.top + rect.height / 2 - tooltip_rect.height / 2
          left = rect.left - tooltip_rect.width - margin
        } else if (placement === `right`) {
          top = rect.top + rect.height / 2 - tooltip_rect.height / 2
          left = rect.right + margin
        } else { // bottom
          top = rect.bottom + margin
          left = rect.left + rect.width / 2 - tooltip_rect.width / 2
        }

        // Keep in viewport
        left = Math.max(8, Math.min(left, globalThis.innerWidth - tooltip_rect.width - 8))
        top = Math.max(8, Math.min(top, globalThis.innerHeight - tooltip_rect.height - 8))

        tooltip.style.left = `${left + globalThis.scrollX}px`
        tooltip.style.top = `${top + globalThis.scrollY}px`
        const custom_opacity = trigger_styles.getPropertyValue(`--tooltip-opacity`).trim()
        tooltip.style.opacity = custom_opacity || `1`

        current_tooltip = Object.assign(tooltip, { _owner: element })
      }, safe_options.delay || 100)
    }

    function hide_tooltip() {
      clear_tooltip()

      if (current_tooltip) {
        current_tooltip.style.opacity = `0`
        if (current_tooltip) {
          current_tooltip.remove()
          current_tooltip = null
        }
      }
    }

    function handle_scroll(event: Event) {
      // Hide if document or any ancestor scrolls (would move element). Skip internal element scrolls.
      const target = event.target
      if (target instanceof Node && target !== element && target.contains(element)) {
        hide_tooltip()
      }
    }

    const events = [`mouseenter`, `mouseleave`, `focus`, `blur`]
    const handlers = [show_tooltip, hide_tooltip, show_tooltip, hide_tooltip]

    events.forEach((event, idx) => element.addEventListener(event, handlers[idx]))

    // Hide tooltip when user scrolls the page (not element-level scrolls like input fields)
    globalThis.addEventListener(`scroll`, handle_scroll, true)

    return () => {
      observer.disconnect()
      events.forEach((event, idx) => element.removeEventListener(event, handlers[idx]))
      globalThis.removeEventListener(`scroll`, handle_scroll, true)

      const original_title = element.getAttribute(`data-original-title`)
      if (original_title) {
        element.setAttribute(`title`, original_title)
        element.removeAttribute(`data-original-title`)
      }
    }
  }

  // Setup tooltip for main node and children
  const main_cleanup = setup_tooltip(node)
  if (main_cleanup) cleanup_functions.push(main_cleanup)

  node.querySelectorAll(`[title], [aria-label], [data-title]`).forEach((element) => {
    const child_cleanup = setup_tooltip(element as HTMLElement)
    if (child_cleanup) cleanup_functions.push(child_cleanup)
  })

  if (cleanup_functions.length === 0) return

  return () => {
    cleanup_functions.forEach((cleanup) => cleanup())
    clear_tooltip()
  }
}

export type ClickOutsideConfig<T extends HTMLElement> = {
  enabled?: boolean
  exclude?: string[]
  callback?: (node: T, config: ClickOutsideConfig<T>) => void
}

export const click_outside =
  <T extends HTMLElement>(config: ClickOutsideConfig<T> = {}) => (node: T) => {
    const { callback, enabled = true, exclude = [] } = config

    if (!enabled) return // Early return avoids registering unused listener

    function handle_click(event: MouseEvent) {
      const target = event.target as HTMLElement
      const path = event.composedPath()

      // Check if click target is the node or inside it
      if (path.includes(node)) return

      // Check excluded selectors
      if (exclude.some((selector) => target.closest(selector))) return

      // Execute callback if provided, passing node and full config
      callback?.(node, { callback, enabled, exclude })

      // Dispatch custom event if click was outside
      node.dispatchEvent(new CustomEvent(`outside-click`))
    }

    document.addEventListener(`click`, handle_click, true)

    return () => document.removeEventListener(`click`, handle_click, true)
  }
