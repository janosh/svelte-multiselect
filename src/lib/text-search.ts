// Find-in-page primitives that match across DOM node boundaries. Unlike the
// highlight_matches attachment, which tests one text node at a time, these
// concatenate every text node inside a block element before matching, so a query
// can straddle inline markup (`<b>fo</b>o` matches `foo`).

// Block-level elements a match is attributed to. Text inside one of them is
// treated as a single string regardless of the inline markup splitting it up.
export const DEFAULT_SEGMENT_SELECTOR =
  `p, li, td, th, pre, blockquote, h1, h2, h3, h4, h5, h6, button, label, ` +
  `[role="row"], [role="cell"]`

// Line breaks and replaced elements interrupt a run of text mid-segment: no
// visible text crosses them, so no match may either.
const BREAK_SELECTOR = `br, hr, input, textarea, select, img, canvas, svg, video, audio, iframe`

// Elements that introduce no visual break, so text either side of one reads as
// continuous even where no DEFAULT_SEGMENT_SELECTOR ancestor groups it
const INLINE_SELECTOR =
  `a, abbr, b, bdi, bdo, cite, code, data, del, dfn, em, i, ins, kbd, mark, q, ` +
  `ruby, s, samp, small, span, strong, sub, sup, time, u, var`

// CSS-hidden content is not detected: getComputedStyle() per element would force
// layout-sensitive traversal. Ordinary hidden content is cheap to exclude, while
// hidden="until-found" stays searchable like it does in the browser's find-in-page.
const NON_RENDERED_SELECTOR = `script, style, noscript, [hidden]:not([hidden="until-found" i])`
const FORM_CONTROL_SELECTOR = `textarea, select`

// Same shape as the node_filter of the highlight_matches attachment: return one of
// the NodeFilter constants to accept or reject a text node.
export type TextSearchNodeFilter = (node: Node) => number

export type TextSearchOptions = {
  // Ordered subsequence matching. A fuzzy match highlights the shortest span found
  // by the greedy scan, including any skipped characters inside that span.
  fuzzy?: boolean
  node_filter?: TextSearchNodeFilter
  segment_selector?: string
}

// matches lists the block elements containing at least one range, in document
// order, for callers stepping through hits
export type TextSearchResult = { matches: Element[]; ranges: Range[] }

type SegmentNode = { node: Text; start: number; end: number }
type TextSegment = { element: Element; nodes: SegmentNode[]; text: string }

const text_segments = (
  root: Element,
  node_filter: TextSearchNodeFilter,
  segment_selector: string,
): TextSegment[] => {
  const segments: TextSegment[] = []
  const break_selector = `${segment_selector}, ${BREAK_SELECTOR}`
  let segment: TextSegment | undefined

  const visit = (node: Node): void => {
    if (node instanceof Text) {
      // empty text nodes span no offsets, and Svelte emits them as anchors between
      // elements, so ending the segment on one would defeat cross-node matching
      if (!node.data) return
      const parent = node.parentElement
      if (!parent || node_filter(node) !== NodeFilter.FILTER_ACCEPT) {
        segment = undefined
        return
      }
      const enclosing = parent.closest(segment_selector)
      let element: Element = parent
      if (enclosing && root.contains(enclosing)) element = enclosing
      else {
        // no block ancestor inside root, so climb out of inline wrappers instead:
        // grouping by the immediate parent would split <div>fo<b>o</b></div>
        while (element !== root && element.matches(INLINE_SELECTOR)) {
          const next_element = element.parentElement
          if (!next_element) break
          element = next_element
        }
      }
      if (segment?.element !== element) {
        segment = { element, nodes: [], text: `` }
        segments.push(segment)
      }
      const start = segment.text.length
      segment.text += node.data
      segment.nodes.push({ node, start, end: segment.text.length })
      return
    }
    // Source text, not content: a hit inside one would scroll the reader to nothing. The
    // segment carries on across it rather than breaking, since the text either side of a
    // <script> renders as one continuous run.
    if (node instanceof Element && node.matches(NON_RENDERED_SELECTOR)) return
    const is_break =
      node !== root && node instanceof Element && node.matches(break_selector)
    if (is_break) segment = undefined
    if (!(node instanceof Element && node.matches(FORM_CONTROL_SELECTOR))) {
      for (const child of node.childNodes) visit(child)
    }
    if (is_break) segment = undefined
  }

  visit(root)
  return segments
}

type MatchBounds = { start: number; end: number }
type NormalizedText = { text: string; offsets: MatchBounds[] }

const WHITESPACE = /\s/u

// offsets[i] brackets the source code point(s) that produced normalized unit i.
// Canonical decomposition and lowercasing can expand a character (é → e + ◌́,
// İ → i + ◌̇), astral characters span two UTF-16 units, and whitespace collapses.
type NormalizedToken = MatchBounds & { char: string }

const normalize_with_offsets = (source: string): NormalizedText => {
  let text = ``
  const offsets: MatchBounds[] = []
  let source_idx = 0
  let in_whitespace = false
  const tokens: NormalizedToken[] = []

  const flush_tokens = (): void => {
    if (tokens.length === 0) return
    const token_queues: Record<string, NormalizedToken[]> = {}
    const queue_offsets: Record<string, number> = {}
    for (const token of tokens) (token_queues[token.char] ??= []).push(token)
    const normalized = tokens
      .map((token) => token.char)
      .join(``)
      .normalize(`NFD`)
    for (const char of normalized) {
      const queue_offset = queue_offsets[char] ?? 0
      const token = token_queues[char][queue_offset]
      queue_offsets[char] = queue_offset + 1
      text += char
      offsets.push(token)
      if (char.length === 2) offsets.push(token)
    }
    tokens.length = 0
  }

  for (const char of source) {
    const next_idx = source_idx + char.length
    if (WHITESPACE.test(char)) {
      flush_tokens()
      // collapse runs so a query with single spaces matches source-formatted markup.
      // The rest of the run needs no offsets: queries are trimmed, so no match can
      // begin or end inside one.
      if (!in_whitespace) {
        text += ` `
        offsets.push({ start: source_idx, end: next_idx })
        in_whitespace = true
      }
    } else {
      in_whitespace = false
      // toLowerCase leaves final sigma distinct from medial sigma, but readers
      // searching for one mean the other
      const normalized_char = char.toLowerCase().replaceAll(`ς`, `σ`).normalize(`NFD`)
      for (const normalized_code_point of normalized_char) {
        tokens.push({
          char: normalized_code_point,
          start: source_idx,
          end: next_idx,
        })
      }
    }
    source_idx = next_idx
  }
  flush_tokens()
  return { text, offsets }
}

// First node reaching min_end. `end` is a running sum of node lengths, so it never
// decreases and the boundary can be binary searched — non-decreasing is all that needs
// to hold, so the empty-node guard above is not load-bearing here. Scanning from the
// front for each of many matches in a segment split across many text nodes is quadratic,
// and a highlighted code block is one segment of hundreds of nodes.
const node_reaching = (nodes: SegmentNode[], min_end: number): SegmentNode => {
  let low = 0
  let high = nodes.length - 1
  while (low < high) {
    const mid = (low + high) >> 1
    if (nodes[mid].end >= min_end) high = mid
    else low = mid + 1
  }
  const found = nodes[low]
  // offsets come from the segment's own text, so they always land inside it
  if (!found || found.end < min_end) {
    throw new Error(`No text node reaches offset ${min_end} of ${nodes.at(-1)?.end}`)
  }
  return found
}

// start and end are offsets into the segment's concatenated text
const range_for_match = (
  { element, nodes }: TextSegment,
  start: number,
  end: number,
): Range => {
  // a match ending exactly on a node boundary stays in that node rather than
  // opening a zero-length tail in the next one
  const start_node = node_reaching(nodes, start + 1)
  const end_node = node_reaching(nodes, end)
  const range = element.ownerDocument.createRange()
  range.setStart(start_node.node, start - start_node.start)
  range.setEnd(end_node.node, end - end_node.start)
  return range
}

const match_bounds = (text: string, query: string, fuzzy: boolean): MatchBounds[] => {
  const matches: MatchBounds[] = []
  if (!fuzzy) {
    let match_idx = text.indexOf(query)
    while (match_idx >= 0) {
      const end = match_idx + query.length
      matches.push({ start: match_idx, end })
      match_idx = text.indexOf(query, end)
    }
    return matches
  }

  // Find compact, non-overlapping ordered subsequences. The forward pass discovers
  // the earliest end, then the backward pass tightens the start before scanning on.
  const query_chars = Array.from(query)
  let search_from = 0

  while (search_from < text.length) {
    let cursor = search_from
    for (const query_char of query_chars) {
      const position = text.indexOf(query_char, cursor)
      if (position === -1) return matches
      cursor = position + query_char.length
    }

    const end = cursor
    let start = end
    for (let char_idx = query_chars.length - 1; char_idx >= 0; char_idx--) {
      const query_char = query_chars[char_idx]
      start = text.lastIndexOf(query_char, start - query_char.length)
    }
    matches.push({ start, end })
    search_from = end
  }
  return matches
}

const source_bounds = (
  offsets: MatchBounds[],
  start: number,
  end: number,
): MatchBounds => {
  let source_start = offsets[start].start
  let source_end = offsets[start].end
  for (let offset_idx = start + 1; offset_idx < end; offset_idx++) {
    source_start = Math.min(source_start, offsets[offset_idx].start)
    source_end = Math.max(source_end, offsets[offset_idx].end)
  }
  return { start: source_start, end: source_end }
}

// Find every occurrence of query under root, case- and whitespace-insensitively.
export const search_text = (
  root: Element,
  query: string,
  options: TextSearchOptions = {},
): TextSearchResult => {
  const {
    fuzzy = false,
    node_filter = () => NodeFilter.FILTER_ACCEPT,
    segment_selector = DEFAULT_SEGMENT_SELECTOR,
  } = options
  const normalized_query = normalize_with_offsets(query).text.trim()
  if (!normalized_query) return { matches: [], ranges: [] }

  const ranges: Range[] = []
  const matched_elements = new Set<Element>()
  for (const segment of text_segments(root, node_filter, segment_selector)) {
    const { text, offsets } = normalize_with_offsets(segment.text)
    for (const { start, end } of match_bounds(text, normalized_query, fuzzy)) {
      const source = source_bounds(offsets, start, end)
      ranges.push(range_for_match(segment, source.start, source.end))
      matched_elements.add(segment.element)
    }
  }
  return { matches: [...matched_elements], ranges }
}

export type HighlightRangesOptions = { css_class?: string; disabled?: boolean }

type OwnedHighlight = {
  owners: Map<symbol, readonly Range[]>
  previous?: Highlight
  installed?: Highlight
}

// Register/release one owner's ranges under a CSS Custom Highlight name shared by
// several of them: the registry holds the union until the last owner goes, then the
// name reverts to whatever held it before. An outside writer taking the name over
// wins — this yields it rather than stomping them.
//
// One store for the whole package, so highlight_matches and highlight_ranges union
// their ranges instead of overwriting each other when they share a name. Keyed by
// registry so a stubbed CSS.highlights cannot leak state into the real one.
const owned_highlights = new WeakMap<HighlightRegistry, Map<string, OwnedHighlight>>()

// Callers own the feature detection: a registry from an environment with no `Highlight`
// constructor throws here rather than silently registering nothing.
export const sync_owned_highlight = (
  registry: HighlightRegistry,
  css_class: string,
  owner: symbol,
  ranges?: readonly Range[],
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
  // Yield to another writer that has taken the name, but not to a vacant one: a
  // CSS.highlights.clear() elsewhere on the page empties the registry without any new
  // owner, and reading that as a takeover would strand this highlight permanently.
  if (state.installed && current && current !== state.installed) return
  state.installed = new Highlight(...[...state.owners.values()].flat())
  registry.set(css_class, state.installed)
}

// Register ranges under a CSS Custom Highlight name, returning a release function.
// Several callers may share one name; the registry holds the union of their ranges
// until the last one releases. Returns undefined where the API is unavailable, in
// which case callers can still style the ranges themselves.
export const highlight_ranges = (
  ranges: readonly Range[],
  options: HighlightRangesOptions = {},
): (() => void) | undefined => {
  const { css_class = `text-search-match`, disabled = false } = options
  const registry = globalThis.CSS?.highlights
  if (disabled || !registry || typeof globalThis.Highlight !== `function`)
    return undefined
  const owner = Symbol(css_class)
  sync_owned_highlight(registry, css_class, owner, ranges)
  return () => sync_owned_highlight(registry, css_class, owner)
}

export type TextMutationOptions = {
  debounce_ms?: number
  // ceiling on how long a sustained burst can postpone the callback
  max_wait_ms?: number
}

// Run callback once a burst of triggers settles, without letting a stream that never
// pauses (a streaming response, say) defer it indefinitely: it lands debounce_ms after
// the last trigger but no later than max_wait_ms after the first one of the burst.
export const create_burst_debounce = (
  callback: () => void,
  { debounce_ms = 75, max_wait_ms = debounce_ms * 4 }: TextMutationOptions = {},
) => {
  let timeout: ReturnType<typeof setTimeout> | undefined
  let burst_started_at: number | undefined

  // The burst is over either way, so the next trigger opens a new one and gets the full
  // debounce_ms — carrying the old start forward would fire it against a max_wait window
  // that had already run out.
  const cancel = (): void => {
    clearTimeout(timeout)
    timeout = undefined
    burst_started_at = undefined
  }
  const trigger = (): void => {
    const now_ms = Date.now()
    burst_started_at ??= now_ms
    clearTimeout(timeout)
    const remaining_max_wait = Math.max(0, max_wait_ms - (now_ms - burst_started_at))
    timeout = setTimeout(
      () => {
        cancel()
        callback()
      },
      Math.min(debounce_ms, remaining_max_wait),
    )
  }
  return { trigger, cancel }
}

// Call on_mutation after the DOM under root stops changing.
export const observe_text_mutations = (
  root: Node,
  on_mutation: () => void,
  options: TextMutationOptions = {},
): (() => void) => {
  const { trigger, cancel } = create_burst_debounce(on_mutation, options)
  const observer = new MutationObserver(trigger)
  observer.observe(root, { childList: true, characterData: true, subtree: true })

  return () => {
    observer.disconnect()
    cancel()
  }
}

export type SearchJumpOptions = {
  class_name?: string
  duration_ms?: number
  // runs when the flash ends, whether by timeout or an explicit clear()
  on_clear?: () => void
}

export type SearchJumpStartOptions = {
  scroll_target?: Element | null
  scroll?: false | ScrollIntoViewOptions
}

export type SearchJump = {
  start: (element: Element | null, options?: SearchJumpStartOptions) => void
  clear: () => void
}

// Scroll the current match into view and mark it with a temporary class, so a
// CSS animation can draw attention to it without the caller tracking timers.
export const create_search_jump = (options: SearchJumpOptions = {}): SearchJump => {
  const { class_name = `search-match-jump`, duration_ms = 2000, on_clear } = options
  let marked: Element | null = null
  let timeout: ReturnType<typeof setTimeout> | undefined

  const clear_visual = (): void => {
    clearTimeout(timeout)
    timeout = undefined
    marked?.classList.remove(class_name)
    marked = null
  }
  const clear = (): void => {
    clear_visual()
    on_clear?.()
  }
  const start = (element: Element | null, opts: SearchJumpStartOptions = {}): void => {
    const { scroll_target = element, scroll = { block: `center`, inline: `nearest` } } =
      opts
    clear_visual()
    marked = element
    if (element) {
      // reading layout between removing and re-adding the class restarts the CSS
      // animation when the same element is jumped to twice in a row
      element.classList.remove(class_name)
      element.getBoundingClientRect()
      element.classList.add(class_name)
    }
    if (scroll) scroll_target?.scrollIntoView(scroll)
    timeout = setTimeout(clear, duration_ms)
  }
  return { clear, start }
}
