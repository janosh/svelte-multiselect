import type { Attachment } from 'svelte/attachments'
import { fuzzy_match_indices, get_uuid } from './utils'
// Computed CSS lengths resolve to `<number>px`; strip the unit so Number() can coerce.
// Empty and non-px values (e.g. `none`, `0.5rem`) yield NaN so callers can apply fallbacks.
const css_px = (css_length: string): number => {
  const trimmed = css_length.trim()
  return trimmed ? Number(trimmed.replace(/px$/, ``)) : NaN
}

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
  (options: DraggableOptions = {}): Attachment =>
  (element: Element): (() => void) | undefined => {
    if (options.disabled) return undefined

    if (!(element instanceof HTMLElement)) return undefined
    const node = element

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
      return undefined
    }

    function handle_mousedown(event: MouseEvent) {
      // Only drag if mousedown is on the handle or its children
      if (!(event.target instanceof Node) || !handle?.contains?.(event.target)) return

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

      options.on_drag?.(event)
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
      // If unmounted mid-drag, undo global side effects mouseup would have reset
      if (dragging) document.body.style.userSelect = ``
      if (handle) {
        handle.removeEventListener(`mousedown`, handle_mousedown)
        handle.style.cursor = `` // Reset cursor
      }
    }
  }

// Automatically sets `position: relative` on elements with `position: static`
// to enable proper positioning during resize. This may affect existing layouts.
export const resizable =
  (options: ResizableOptions = {}): Attachment =>
  (element: Element): (() => void) | undefined => {
    if (options.disabled) return undefined

    if (!(element instanceof HTMLElement)) return undefined
    const node = element
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
      return undefined // Invalid config would cause clamp() to produce inconsistent results
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

      const dx = event.clientX - start.x,
        dy = event.clientY - start.y
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
      node.style.cursor =
        edge === `right` || edge === `left`
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
      // If unmounted mid-resize, undo global side effects mouseup would have reset
      if (active_edge) document.body.style.userSelect = ``
      node.style.cursor = ``
    }
  }

export function get_html_sort_value(element: HTMLElement): string {
  if (element.dataset.sortValue !== undefined) {
    return element.dataset.sortValue
  }
  for (const child of Array.from(element.children)) {
    if (!(child instanceof HTMLElement)) continue
    const child_val = get_html_sort_value(child)
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

export const sortable =
  (options: SortableOptions = {}) =>
  (node: HTMLElement) => {
    const {
      header_selector = `thead th`,
      asc_class = `table-sort-asc`,
      desc_class = `table-sort-desc`,
      sorted_style = { backgroundColor: `rgba(255, 255, 255, 0.1)` },
      disabled = false,
    } = options

    if (disabled) return undefined

    // This action can be applied to standard HTML tables to make them sortable by
    // clicking on column headers (and clicking again to toggle sorting direction)
    const headers = Array.from(
      node.querySelectorAll<HTMLTableCellElement>(header_selector),
    )
    let sort_col_idx: number
    let sort_dir = 1 // 1 = asc, -1 = desc

    type HeaderState = {
      header: HTMLTableCellElement
      handler: () => void
      original_html: string
      original_style: string
    }
    // Store original state for cleanup
    const header_state: HeaderState[] = []
    const restore_header = ({ header, original_html, original_style }: HeaderState) => {
      // Restore innerHTML (not textContent) to preserve child markup like icons
      header.innerHTML = original_html
      header.classList.remove(asc_class, desc_class)
      if (original_style) header.setAttribute(`style`, original_style)
      else header.removeAttribute(`style`)
    }

    headers.forEach((header, idx) => {
      const original_html = header.innerHTML
      const original_style = header.getAttribute(`style`) ?? ``
      header.style.cursor = `pointer` // add cursor pointer to headers

      const click_handler = () => {
        // reset all headers to unsorted state
        for (const state of header_state) {
          restore_header(state)
          state.header.style.cursor = `pointer`
        }
        if (idx === sort_col_idx) {
          sort_dir *= -1 // reverse sort direction
        } else {
          sort_col_idx = idx // set new sort column index
          sort_dir = 1 // reset sort direction
        }
        header.classList.add(sort_dir > 0 ? asc_class : desc_class)
        Object.assign(header.style, sorted_style)
        // Render arrow in a separate span so the header's own markup stays intact
        // (restore_header above already removed any previous arrow span)
        const arrow_span = document.createElement(`span`)
        arrow_span.className = `sort-arrow`
        arrow_span.textContent = ` ${sort_dir > 0 ? `↑` : `↓`}`
        header.append(arrow_span)

        const table_body = node.querySelector(`tbody`)
        if (!table_body) return

        // re-sort table (:scope > tr so rows of nested tables aren't re-parented)
        const rows = Array.from(
          table_body.querySelectorAll<HTMLTableRowElement>(`:scope > tr`),
        )
        rows.sort((row_1, row_2) => {
          const cell_1 = row_1.cells[sort_col_idx]
          const cell_2 = row_2.cells[sort_col_idx]
          // Rows can have fewer cells than the sort column (colspan placeholders,
          // ragged rows) — treat missing cells as empty so they sort last
          const val_1 = cell_1 ? get_html_sort_value(cell_1) : ``
          const val_2 = cell_2 ? get_html_sort_value(cell_2) : ``

          const [trimmed_1, trimmed_2] = [val_1.trim(), val_2.trim()]
          if (trimmed_1 === trimmed_2) return 0
          if (trimmed_1 === ``) return 1 // treat empty/whitespace as lower than any value
          if (trimmed_2 === ``) return -1
          const num_1 = Number(trimmed_1)
          const num_2 = Number(trimmed_2)
          if (isNaN(num_1) && isNaN(num_2)) {
            return (
              sort_dir * trimmed_1.localeCompare(trimmed_2, undefined, { numeric: true })
            )
          }
          // sort non-numeric values after numeric ones
          if (isNaN(num_1)) return sort_dir
          if (isNaN(num_2)) return -sort_dir
          return sort_dir * (num_1 - num_2)
        })

        for (const row of rows) table_body.append(row)
      }

      header.addEventListener(`click`, click_handler)
      header_state.push({ header, handler: click_handler, original_html, original_style })
    })

    // Return cleanup function that fully restores original state
    return () => {
      for (const state of header_state) {
        state.header.removeEventListener(`click`, state.handler)
        restore_header(state)
      }
    }
  }

export type HighlightOptions = {
  query?: string
  disabled?: boolean
  fuzzy?: boolean
  node_filter?: (node: Node) => number
  css_class?: string
  duration_ms?: number
  scroll_to_match?: false | ScrollIntoViewOptions
  on_highlight?: (context: { node: HTMLElement; ranges: Range[] }) => unknown
}

type OwnedHighlight = {
  owners: Map<symbol, Range[]>
  previous?: Highlight
  installed?: Highlight
}

const owned_highlights = new WeakMap<object, Map<string, OwnedHighlight>>()

const sync_owned_highlight = (
  registry: HighlightRegistry,
  css_class: string,
  owner: symbol,
  ranges?: Range[],
): void => {
  let classes = owned_highlights.get(registry)
  if (!classes) {
    if (!ranges) return
    classes = new Map()
    owned_highlights.set(registry, classes)
  }
  let state = classes.get(css_class)
  if (!state) {
    if (!ranges) return
    state = { owners: new Map(), previous: registry.get(css_class) }
    classes.set(css_class, state)
  }
  if (ranges) state.owners.set(owner, ranges)
  else state.owners.delete(owner)
  const current = registry.get(css_class)
  if (state.owners.size === 0) {
    classes.delete(css_class)
    if (current !== state.installed) return
    if (state.previous) registry.set(css_class, state.previous)
    else registry.delete(css_class)
    return
  }
  if (state.installed && current !== state.installed) return
  state.installed = new Highlight(...[...state.owners.values()].flat())
  registry.set(css_class, state.installed)
}

export const highlight_matches = (ops: HighlightOptions) => (node: HTMLElement) => {
  const {
    query = ``,
    disabled = false,
    fuzzy = false,
    node_filter = () => NodeFilter.FILTER_ACCEPT,
    css_class = `highlight-match`,
    duration_ms,
    scroll_to_match = { behavior: `smooth`, block: `center` },
    on_highlight,
  } = ops

  const search = query.trim().toLowerCase().replaceAll(/\s+/gu, ` `)
  // if disabled or empty query, this instance owns no highlight
  if (!search || disabled) return undefined
  const highlight_registry = globalThis.CSS?.highlights
  const highlight_owner = Symbol(css_class)
  const substring_pattern = new RegExp(
    search.replaceAll(/[.*+?^${}()|[\]\\]/gu, `\\$&`).replaceAll(` `, `\\s+`),
    `gu`,
  )
  let active = true
  let did_scroll = false
  let effect_cleanup: (() => void) | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined

  const find_ranges = (text_node: Node): Range[] => {
    const original_text = text_node.textContent
    if (!original_text) return []
    const text = original_text.toLowerCase()

    // Offsets are computed on the lowercased text but applied to the original
    // node. Lowercasing can grow some Unicode chars (e.g. İ → i̇), while astral
    // characters span two UTF-16 units. Map each lowered unit to the complete
    // original code point so ranges never shift or split a character.
    const node_length = original_text.length
    let original_starts: number[] | null = null
    let original_ends: number[] | null = null
    let needs_offset_map = false
    for (const character of original_text) {
      if (character.length > 1 || character.toLowerCase().length !== character.length) {
        needs_offset_map = true
        break
      }
    }
    if (needs_offset_map) {
      original_starts = []
      original_ends = []
      let original_idx = 0
      for (const character of original_text) {
        const original_end = original_idx + character.length
        const lowered_length = character.toLowerCase().length
        original_starts.push(
          ...Array.from({ length: lowered_length }, () => original_idx),
        )
        original_ends.push(...Array.from({ length: lowered_length }, () => original_end))
        original_idx = original_end
      }
    }
    const make_range = (start: number, end: number): Range[] => {
      const original_start = original_starts
        ? (original_starts[start] ?? node_length)
        : start
      const original_end = original_ends ? (original_ends[end - 1] ?? node_length) : end
      if (original_start >= node_length) return []
      const range = node.ownerDocument.createRange()
      range.setStart(text_node, original_start)
      range.setEnd(text_node, Math.min(original_end, node_length))
      return [range]
    }

    if (fuzzy) {
      // null means not all characters matched, so highlight nothing.
      const matching_indices = fuzzy_match_indices(search, text)
      const unique_ranges = new Map<string, Range>()
      for (const index of matching_indices ?? []) {
        const [range] = make_range(index, index + 1)
        if (range) unique_ranges.set(`${range.startOffset}:${range.endOffset}`, range)
      }
      return [...unique_ranges.values()]
    }
    return [...text.matchAll(substring_pattern)].flatMap((match) =>
      make_range(match.index, match.index + match[0].length),
    )
  }

  const update_highlight = () => {
    if (!active) return
    observer.disconnect()
    try {
      const previous_cleanup = effect_cleanup
      effect_cleanup = undefined
      previous_cleanup?.()
      if (!active) return
      const tree_walker = node.ownerDocument.createTreeWalker(
        node,
        NodeFilter.SHOW_TEXT,
        { acceptNode: node_filter },
      )
      const ranges: Range[] = []
      let text_node = tree_walker.nextNode()
      while (text_node) {
        ranges.push(...find_ranges(text_node))
        text_node = tree_walker.nextNode()
      }
      if (highlight_registry)
        sync_owned_highlight(highlight_registry, css_class, highlight_owner, ranges)
      const first_match = ranges[0]?.startContainer.parentElement
      if (!did_scroll && scroll_to_match && first_match) {
        did_scroll = true
        first_match.scrollIntoView(scroll_to_match)
      }
      const next_effect_cleanup = on_highlight?.({ node, ranges })
      effect_cleanup =
        typeof next_effect_cleanup === `function`
          ? () => next_effect_cleanup()
          : undefined
    } finally {
      if (active)
        observer.observe(node, { childList: true, subtree: true, characterData: true })
    }
  }

  const observer = new MutationObserver(update_highlight)
  const cleanup = () => {
    if (!active) return
    active = false
    if (timeout !== undefined) clearTimeout(timeout)
    observer.disconnect()
    const final_effect_cleanup = effect_cleanup
    effect_cleanup = undefined
    try {
      final_effect_cleanup?.()
    } finally {
      if (highlight_registry)
        sync_owned_highlight(highlight_registry, css_class, highlight_owner)
    }
  }
  try {
    update_highlight()
  } catch (error) {
    cleanup()
    throw error
  }
  if (duration_ms !== undefined && Number.isFinite(duration_ms) && duration_ms >= 0) {
    timeout = setTimeout(cleanup, duration_ms)
  }

  return cleanup
}

// Global tooltip state to ensure only one tooltip is shown at a time
let current_tooltip: (HTMLElement & { owner_element?: HTMLElement }) | null = null
let show_timeout: ReturnType<typeof setTimeout> | undefined
let hide_timeout: ReturnType<typeof setTimeout> | undefined
// Element that scheduled the pending show_timeout. owner_element is only set once
// the timeout fires, so pending shows need their own ownership tracking to let
// cleanup of one tooltip instance leave another instance's pending show alone.
let show_timeout_owner: HTMLElement | null = null

function clear_tooltip() {
  if (show_timeout) clearTimeout(show_timeout)
  show_timeout_owner = null
  if (hide_timeout) clearTimeout(hide_timeout)
  if (current_tooltip) {
    // Remove aria-describedby from the trigger element
    current_tooltip.owner_element?.removeAttribute(`aria-describedby`)
    current_tooltip.remove()
    current_tooltip = null
  }
}

// whether the element owns the visible tooltip or a pending (delayed) show
const owns_tooltip_state = (element: HTMLElement): boolean =>
  current_tooltip?.owner_element === element || show_timeout_owner === element

// Options for the tooltip attachment.
export interface TooltipOptions {
  content?: string
  placement?: `top` | `bottom` | `left` | `right`
  delay?: number
  hide_delay?: number // Delay before hiding tooltip (ms), helps with rapid hover transitions
  disabled?: boolean | `touch-devices` // true disables always, 'touch-devices' uses runtime detection
  style?: string
  show_arrow?: boolean // Whether to show the arrow pointer (default: true)
  offset?: number // Distance from trigger element in pixels (default: 12)
  // Security: HTML rendering is opt-in. Set to true only for trusted or sanitized content.
  allow_html?: boolean
  // Optional sanitizer for HTML content - called before setting innerHTML when allow_html is true
  sanitize_html?: (html: string) => string
}

function render_tooltip_content(
  content_el: HTMLElement,
  content: string,
  options: TooltipOptions,
) {
  if (options.allow_html !== true) {
    content_el.textContent = content
    return
  }

  // Convert all newline flavors: HTML parsing normalizes CR/CRLF to LF in
  // attributes, and JS callers pass \n, so matching only \r would never fire
  let html = content.replaceAll(/\r\n?|\n/gu, `<br/>`)
  if (options.sanitize_html) html = options.sanitize_html(html)
  content_el.innerHTML = html
}

export const tooltip =
  (options: TooltipOptions = {}): Attachment =>
  (node: Element): (() => void) | undefined => {
    // SSR guard + element validation
    if (typeof document === `undefined` || !(node instanceof HTMLElement))
      return undefined

    const cleanup_functions: (() => void)[] = []

    // Handle disabled option
    if (options.disabled === true) return undefined

    // Track current input method for 'touch-devices' option (runtime detection, not capability sniffing)
    // This allows tooltips on hybrid devices (Surface, iPad with mouse) when using mouse/stylus
    let last_pointer_type: string = `mouse`
    const track_pointer = (event: PointerEvent) => {
      last_pointer_type = event.pointerType
    }
    if (options.disabled === `touch-devices`) {
      document.addEventListener(`pointerdown`, track_pointer, true)
      cleanup_functions.push(() =>
        document.removeEventListener(`pointerdown`, track_pointer, true),
      )
    }

    function setup_tooltip(element: HTMLElement): (() => void) | undefined {
      const tooltip_attrs = [`title`, `aria-label`, `data-title`]
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string should fall through
      let content =
        ((options.content ?? element.title) || element.getAttribute(`aria-label`)) ??
        element.getAttribute(`data-title`)
      if (!content) return undefined

      // Store original title and remove it to prevent native browser tooltip.
      // This must happen even when options.content is provided, otherwise both
      // custom and native tooltips may appear.
      if (element.hasAttribute(`title`)) {
        element.setAttribute(`data-original-title`, element.title)
        element.removeAttribute(`title`)
      }

      // Reactively update content when tooltip attributes change
      const observer = new MutationObserver((mutations) => {
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
            observer.observe(element, {
              attributes: true,
              attributeFilter: tooltip_attrs,
            })
            // Preserve original title for cleanup if title is set later dynamically
            if (!element.hasAttribute(`data-original-title`) && new_content) {
              element.setAttribute(`data-original-title`, new_content)
            }
          }
          if (options.content) continue // custom content takes precedence
          // Only update content if non-empty
          if (!new_content) continue
          content = new_content
          // Only update tooltip if this element owns it
          if (current_tooltip?.owner_element === element) {
            const content_el =
              current_tooltip.querySelector<HTMLElement>(`.tooltip-content`)
            if (content_el) {
              render_tooltip_content(content_el, content, options)
              // Re-run sizing/positioning after content change
              resize_and_position_tooltip(current_tooltip, element)
            }
          }
        }
      })
      observer.observe(element, { attributes: true, attributeFilter: tooltip_attrs })

      type Placement = `top` | `right` | `bottom` | `left`
      const opposite: Record<Placement, Placement> = {
        top: `bottom`,
        bottom: `top`,
        left: `right`,
        right: `left`,
      }

      const apply_triangle_style = (
        el: HTMLElement,
        placement: Placement,
        px: number,
        color: string,
      ) => {
        el.style.cssText = `position: absolute; width: 0; height: 0; pointer-events: none;`
        const vert = placement === `top` || placement === `bottom`
        const set = (prop: string, val: string) => el.style.setProperty(prop, val)
        set(vert ? `left` : `top`, `calc(50% - ${px}px)`)
        set(opposite[placement], `-${px}px`)
        set(`border-${vert ? `left` : `top`}`, `${px}px solid transparent`)
        set(`border-${vert ? `right` : `bottom`}`, `${px}px solid transparent`)
        set(`border-${placement}`, `${px}px solid ${color}`)
      }

      const sync_arrow_styles = (tooltip_el: HTMLElement, placement: Placement) => {
        const arrow = tooltip_el.querySelector<HTMLElement>(`.custom-tooltip-arrow`)
        if (!arrow) return

        const tooltip_styles = getComputedStyle(tooltip_el)
        const default_arrow_color = `var(--tooltip-bg, light-dark(#fff, #2a2a2e))`
        const tooltip_bg = tooltip_styles.backgroundColor.trim()
        const transparent_colors = new Set([``, `transparent`, `rgba(0, 0, 0, 0)`])
        const is_transparent = (color: string) => transparent_colors.has(color.trim())
        const arrow_size_raw = tooltip_styles
          .getPropertyValue(`--tooltip-arrow-size`)
          .trim()
        const arrow_size_num = css_px(arrow_size_raw)
        const arrow_px = Number.isFinite(arrow_size_num) ? arrow_size_num : 6
        apply_triangle_style(
          arrow,
          placement,
          arrow_px,
          is_transparent(tooltip_bg) ? default_arrow_color : tooltip_bg,
        )

        const border_arrow = tooltip_el.querySelector<HTMLElement>(
          `.custom-tooltip-arrow-border`,
        )
        if (!border_arrow) return

        const border_color = tooltip_styles.borderTopColor
        const border_width_num = css_px(tooltip_styles.borderTopWidth)
        const has_border = !is_transparent(border_color) && border_width_num > 0
        if (!has_border) {
          border_arrow.remove()
          return
        }
        apply_triangle_style(
          border_arrow,
          placement,
          arrow_px + border_width_num * 1.4,
          border_color,
        )
      }

      // Shrink tooltip to fit content, then position for correct centering
      function resize_and_position_tooltip(tooltip_el: HTMLElement, trigger: Element) {
        // Reset width to allow natural sizing before measuring
        tooltip_el.style.width = ``

        requestAnimationFrame(() => {
          if (!document.body.contains(tooltip_el)) return
          const computed = getComputedStyle(tooltip_el)
          const padding_h = css_px(computed.paddingLeft) + css_px(computed.paddingRight)
          const border_h =
            css_px(computed.borderLeftWidth) + css_px(computed.borderRightWidth)
          // Handle max-width: none as unbounded, fallback to 280 only for invalid values
          const max_width_raw = computed.maxWidth
          const max_width_parsed = css_px(max_width_raw)
          const max_width =
            max_width_raw === `none`
              ? Infinity
              : Number.isFinite(max_width_parsed)
                ? max_width_parsed
                : 280
          // With border-box, width includes padding+border; with content-box, subtract them
          const box_adjust =
            computed.boxSizing === `border-box` ? 0 : padding_h + border_h
          const style = tooltip_el.style
          const raw = tooltip_el.getAttribute(`data-placement`) ?? ``
          const requested_placement: Placement =
            raw === `top` || raw === `right` || raw === `bottom` || raw === `left`
              ? raw
              : `bottom`

          // Save styles, measure single-line width with wrapping disabled
          const saved = {
            maxWidth: style.maxWidth,
            overflowWrap: style.overflowWrap,
            textWrap: style.textWrap,
            whiteSpace: style.whiteSpace,
          }
          Object.assign(style, {
            maxWidth: `none`,
            overflowWrap: `normal`,
            textWrap: `nowrap`,
            whiteSpace: `nowrap`,
            width: `auto`,
          })
          const single_line_width = tooltip_el.offsetWidth
          Object.assign(style, saved)

          // Convert offsetWidth to the value needed for style.width
          const content_width = single_line_width - box_adjust
          if (content_width <= max_width) {
            // Single-line: set exact width and prevent wrapping
            style.width = `${Math.max(0, content_width)}px`
            style.textWrap = `nowrap`
          } else {
            // Multi-line: binary search for minimum width that doesn't add line breaks
            style.width = ``
            const baseline_height = tooltip_el.offsetHeight
            const initial_width = tooltip_el.offsetWidth

            // Get min-content (longest word) as lower bound
            Object.assign(style, {
              maxWidth: `none`,
              overflowWrap: `normal`,
              width: `min-content`,
            })
            const min_width = tooltip_el.offsetWidth
            Object.assign(style, {
              maxWidth: saved.maxWidth,
              overflowWrap: saved.overflowWrap,
              width: `${initial_width - box_adjust}px`,
            })

            // If longest word exceeds wrapped width, grow past max-width so the
            // word stays intact (restoring maxWidth would clamp width back down).
            if (min_width >= initial_width) {
              style.maxWidth = `none`
              style.width = `${min_width - box_adjust}px`
            } else {
              // Binary search for minimum width that maintains baseline height
              // Work in offsetWidth units, convert to style.width only when setting
              let [best, high, low] = [initial_width, initial_width, min_width]
              while (high - low > 1) {
                const mid = Math.floor((low + high) / 2)
                style.width = `${mid - box_adjust}px`
                if (tooltip_el.offsetHeight > baseline_height) low = mid
                else {
                  best = mid
                  high = mid
                }
              }
              style.width = `${best - box_adjust}px`
            }
          }

          // Position tooltip after width adjustment so centering uses final dimensions
          const rect = trigger.getBoundingClientRect()
          const tooltip_rect = tooltip_el.getBoundingClientRect()
          const margin = options.offset ?? 12

          const center_h = rect.left + rect.width / 2 - tooltip_rect.width / 2
          const center_v = rect.top + rect.height / 2 - tooltip_rect.height / 2

          const position_by_placement: Record<Placement, { top: number; left: number }> =
            {
              top: { top: rect.top - tooltip_rect.height - margin, left: center_h },
              bottom: { top: rect.bottom + margin, left: center_h },
              left: { top: center_v, left: rect.left - tooltip_rect.width - margin },
              right: { top: center_v, left: rect.right + margin },
            }

          const fallback_order: Record<Placement, Placement[]> = {
            bottom: [`bottom`, `top`, `right`, `left`],
            top: [`top`, `bottom`, `right`, `left`],
            right: [`right`, `left`, `bottom`, `top`],
            left: [`left`, `right`, `bottom`, `top`],
          }

          const min_padding = 8
          const { innerWidth, innerHeight } = globalThis

          const get_overflow = ({ top, left }: { top: number; left: number }) =>
            Math.max(0, min_padding - top) +
            Math.max(0, min_padding - left) +
            Math.max(0, top + tooltip_rect.height + min_padding - innerHeight) +
            Math.max(0, left + tooltip_rect.width + min_padding - innerWidth)

          let chosen_placement = requested_placement
          let best_overflow = Infinity
          for (const candidate of fallback_order[requested_placement]) {
            const overflow = get_overflow(position_by_placement[candidate])
            if (overflow < best_overflow) {
              chosen_placement = candidate
              best_overflow = overflow
            }
            if (overflow === 0) break
          }

          // Persist final placement for downstream styling.
          tooltip_el.setAttribute(`data-placement`, chosen_placement)
          sync_arrow_styles(tooltip_el, chosen_placement)

          let { top, left } = position_by_placement[chosen_placement]

          // Keep in viewport
          const max_left = innerWidth - tooltip_rect.width - min_padding
          left = Math.max(min_padding, Math.min(left, max_left))
          const max_top = innerHeight - tooltip_rect.height - min_padding
          top = Math.max(min_padding, Math.min(top, max_top))

          style.left = `${left + globalThis.scrollX}px`
          style.top = `${top + globalThis.scrollY}px`
          style.opacity =
            getComputedStyle(trigger).getPropertyValue(`--tooltip-opacity`).trim() || `1`
        })
      }

      function show_tooltip() {
        // Skip tooltip on touch input when 'touch-devices' option is set
        if (options.disabled === `touch-devices` && last_pointer_type === `touch`) return

        clear_tooltip()

        show_timeout_owner = element
        show_timeout = setTimeout(() => {
          show_timeout_owner = null
          const tooltip_el = document.createElement(`div`)
          tooltip_el.className = `custom-tooltip`
          const placement = options.placement ?? `bottom`
          tooltip_el.setAttribute(`data-placement`, placement)

          // Accessibility: link tooltip to trigger element
          const tooltip_id = `tooltip-${get_uuid()}`
          tooltip_el.id = tooltip_id
          tooltip_el.setAttribute(`role`, `tooltip`)
          element.setAttribute(`aria-describedby`, tooltip_id)
          // light-dark() inherits the page's color-scheme (defaults to light if unset)
          tooltip_el.style.cssText = `
          position: absolute; z-index: 9999; opacity: 0; display: inline-block;
          background-color: var(--tooltip-bg, light-dark(#fff, #2a2a2e)); color: var(--text-color, light-dark(#222, #eee)); border: var(--tooltip-border, 1px solid light-dark(lightgray, #555));
          padding: var(--tooltip-padding, 2px 6px); border-radius: var(--tooltip-radius, 5pt); font-size: var(--tooltip-font-size, 0.8rem); line-height: 1.4;
          max-width: var(--tooltip-max-width, 280px); overflow-wrap: break-word; text-wrap: balance; pointer-events: none;
          filter: var(--tooltip-shadow, drop-shadow(0 2px 8px rgba(0,0,0,0.25))); transition: opacity 0.15s ease-out;
        `

          // Apply custom styles if provided (these will override base styles due to CSS specificity)
          if (options.style) {
            const custom_style = document.createElement(`div`).style
            custom_style.cssText = options.style
            for (let idx = 0; idx < custom_style.length; idx++) {
              const property = custom_style.item(idx)
              tooltip_el.style.setProperty(
                property,
                custom_style.getPropertyValue(property),
                custom_style.getPropertyPriority(property),
              )
            }
          }

          // Wrap content in a span for reactive content updates
          const content_span = document.createElement(`span`)
          content_span.className = `tooltip-content`
          // Security: content renders as plain text unless allow_html is explicitly true.
          render_tooltip_content(content_span, content ?? ``, options)
          tooltip_el.append(content_span)

          // Mirror CSS custom properties from the trigger node onto the tooltip element
          const trigger_styles = getComputedStyle(element)
          for (const css_var_name of [
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
          ]) {
            const value = trigger_styles.getPropertyValue(css_var_name).trim()
            if (value) tooltip_el.style.setProperty(css_var_name, value)
          }

          // Pages that style themselves dark via CSS vars but never declare `color-scheme`
          // resolve the default light-dark() background to LIGHT while the inherited
          // --text-color may be near-white → unreadable tooltip. Follow the OS preference
          // and pair the text color with it. Pages that declare a scheme keep control
          // (see #405), as do triggers with custom --tooltip-bg or own --text-color.
          // Read the scheme from document.body (inherits any root-declared scheme), not
          // the trigger: the tooltip is appended to body, so a scheme on some container
          // around the trigger never reaches it.
          const body_styles = getComputedStyle(document.body)
          const page_scheme = body_styles.colorScheme
          if (!page_scheme || page_scheme === `normal`) {
            // A var counts as a per-trigger override only if it differs from the value
            // inherited from body/:root (page-level styling shouldn't disable the
            // fallback). Compare against body, not documentElement: the body-mounted
            // tooltip inherits from body, which in turn inherits :root-declared vars.
            const overrides_page = (css_var: string) => {
              const value = tooltip_el.style.getPropertyValue(css_var)
              return value && value !== body_styles.getPropertyValue(css_var).trim()
            }
            if (!overrides_page(`--tooltip-bg`) && !overrides_page(`--text-color`)) {
              tooltip_el.style.setProperty(`color-scheme`, `light dark`)
              tooltip_el.style.setProperty(`--text-color`, `light-dark(#222, #eee)`)
            }
          }

          // Append early so we can read computed border styles for arrow border
          document.body.append(tooltip_el)

          // Create arrow elements before resize so the rAF inside
          // resize_and_position_tooltip can find and style them with the resolved placement.
          if (options.show_arrow !== false) {
            const border_arrow = document.createElement(`div`)
            border_arrow.className = `custom-tooltip-arrow-border`
            const arrow = document.createElement(`div`)
            arrow.className = `custom-tooltip-arrow`
            tooltip_el.append(border_arrow, arrow)
          }

          resize_and_position_tooltip(tooltip_el, element)

          current_tooltip = Object.assign(tooltip_el, { owner_element: element })
        }, options.delay ?? 100)
      }

      function handle_keydown(event: KeyboardEvent) {
        if (event.key === `Escape` && current_tooltip?.owner_element === element) {
          clear_tooltip()
        }
      }

      function hide_tooltip() {
        if (show_timeout) clearTimeout(show_timeout)
        const delay = options.hide_delay ?? 0
        if (delay > 0) {
          hide_timeout = setTimeout(() => clear_tooltip(), delay)
        } else clear_tooltip()
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

      // Add Escape key listener to dismiss tooltip
      document.addEventListener(`keydown`, handle_keydown)

      // Watch for element removal from DOM to prevent orphaned tooltips
      const removal_observer = new MutationObserver((mutations) => {
        const was_removed = mutations.some((mut) =>
          Array.from(mut.removedNodes).some(
            (removed_node) =>
              removed_node === element ||
              (removed_node instanceof Element && removed_node.contains(element)),
          ),
        )
        // Clear owned visible tooltip AND owned pending show — otherwise the
        // pending timeout fires after removal and appends an orphaned tooltip
        // positioned against a detached element
        if (was_removed && owns_tooltip_state(element)) clear_tooltip()
      })
      if (element.parentElement) {
        removal_observer.observe(element.parentElement, {
          childList: true,
          subtree: true,
        })
      }

      return () => {
        observer.disconnect()
        removal_observer.disconnect()
        events.forEach((event, idx) => element.removeEventListener(event, handlers[idx]))
        globalThis.removeEventListener(`scroll`, handle_scroll, true)
        document.removeEventListener(`keydown`, handle_keydown)

        // Clear owned tooltip/pending show (also removes aria-describedby)
        if (owns_tooltip_state(element)) clear_tooltip()

        if (element.hasAttribute(`data-original-title`)) {
          element.setAttribute(`title`, element.getAttribute(`data-original-title`) ?? ``)
          element.removeAttribute(`data-original-title`)
        }
      }
    }

    // Setup tooltip for main node and children
    const main_cleanup = setup_tooltip(node)
    if (main_cleanup) cleanup_functions.push(main_cleanup)

    node.querySelectorAll(`[title], [aria-label], [data-title]`).forEach((el) => {
      if (!(el instanceof HTMLElement)) return
      const child_cleanup = setup_tooltip(el)
      if (child_cleanup) cleanup_functions.push(child_cleanup)
    })

    if (cleanup_functions.length === 0) return undefined

    // per-element cleanups already clear any tooltip/pending show they own, and
    // only elements set up here can own one — no extra outer clearing needed
    return () => cleanup_functions.forEach((cleanup) => cleanup())
  }

export type ClickOutsideConfig<T extends HTMLElement> = {
  enabled?: boolean
  exclude?: string[]
  callback?: (node: T, config: ClickOutsideConfig<T>) => void
}

export const click_outside =
  <T extends HTMLElement>(config: ClickOutsideConfig<T> = {}) =>
  (node: T): (() => void) | undefined => {
    const { callback, enabled = true, exclude = [] } = config

    if (!enabled) return undefined // Early return avoids registering unused listener

    function handle_click(event: MouseEvent) {
      const { target } = event
      // Element (not HTMLElement) so clicks on SVG elements still count; .closest
      // below exists on all Elements
      if (!(target instanceof Element)) return
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

    return () => {
      document.removeEventListener(`click`, handle_click, true)
    }
  }
