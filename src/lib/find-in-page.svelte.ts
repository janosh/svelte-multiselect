// Reactive find-in-page cursor: owns the query, the matches under a root element, which
// one is current, the CSS highlight over all of them, and the observer that keeps the
// set fresh as the page changes. FindBar renders the usual chrome over this; drive it
// directly where the chrome differs, e.g. a dialog header that also filters its own
// content, or a panel that reports matches per section. Wire it from two effects, as
// FindBar does: one calling refresh(root) that releases the highlight on teardown, and
// one calling observe(root), which must not share the first one's teardown — on a root
// change the refresh effect reruns first and installs the next highlight.

import { untrack } from 'svelte'
import {
  create_search_jump,
  highlight_ranges,
  observe_text_mutations,
  search_text,
} from './text-search'

// Always excluded: content that renders but that the reader does not see, so a hit in
// it would scroll them to nothing. search_text already skips non-rendered markup
// (script, style, [hidden]) and form controls, so this only names the rest.
export const IGNORED_SELECTOR = `[aria-hidden="true"], .sr-only`

export type FindOptions = {
  // CSS Custom Highlight name carrying every match; style it with ::highlight(name).
  // Several find states may share one name: the registry holds the union.
  css_class?: string
  // Confine matches to text inside these selectors. A surface whose findable content
  // sits in a few known regions (message bodies, a log pane, a field grid) surrounded
  // by chrome states what is searchable; the chrome is open-ended, so also_ignore
  // cannot express it as exceptions.
  only_within?: string
  // Further selectors to exclude, on top of IGNORED_SELECTOR rather than instead of it
  also_ignore?: string
  // Runs before each search with the trimmed query, for callers that hide non-matching
  // content themselves. search_text skips [hidden] subtrees, so that filtering has to
  // land before the search rather than after it.
  before_search?: (query: string) => void
}

// Options come from a getter, not a snapshot, so a component can hand its own props
// straight through without freezing them at creation time.
export const create_find_state = (get_options: () => FindOptions = () => ({})) => {
  const node_filter = (node: Node): number => {
    const { only_within, also_ignore } = get_options()
    const parent = node.parentElement
    if (only_within && !parent?.closest(only_within)) return NodeFilter.FILTER_REJECT
    const selector = also_ignore
      ? `${IGNORED_SELECTOR}, ${also_ignore}`
      : IGNORED_SELECTOR
    return parent?.closest(selector) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  }

  let query = $state(``)
  let matches = $state<Element[]>([])
  let current_idx = $state(-1)
  let release: (() => void) | undefined
  const jump = create_search_jump()

  // Wraps at both ends, for any idx: `% length` alone goes negative below -length
  const jump_to = (idx: number): void => {
    const count = matches.length
    if (count === 0) return
    current_idx = ((idx % count) + count) % count
    const match = matches[current_idx]
    // A match inside a collapsed <details> has no box to scroll to, so reveal it the
    // way the browser's own find-in-page does.
    const collapsed = match?.closest<HTMLDetailsElement>(`details:not([open])`)
    if (collapsed) collapsed.open = true
    jump.start(match ?? null)
  }

  // With no cursor yet, a forward step lands on the first match (-1 + 1) and a backward
  // one on the last, which is where jump_to wraps -1 around to.
  const step = (direction: -1 | 1): void =>
    jump_to(current_idx < 0 && direction < 0 ? -1 : current_idx + direction)

  // `root` is passed per call rather than held, so a container that mounts late or gets
  // swapped out is never searched stale.
  const refresh = (root?: Element | null): void => {
    const { css_class = `find-match`, before_search } = get_options()
    before_search?.(query.trim())
    // Untracked: a caller refreshing from an $effect must not re-run on its own writes.
    const [previous, previous_idx] = untrack(() => [matches[current_idx], current_idx])
    const result = root
      ? search_text(root, query, { node_filter })
      : { matches: [], ranges: [] }
    matches = result.matches
    // Stay on the same element across a re-search where it survived, so a page mutating
    // under the reader does not walk the cursor down the list.
    const preserved_idx = previous ? result.matches.indexOf(previous) : -1
    current_idx =
      preserved_idx >= 0
        ? preserved_idx
        : Math.min(previous_idx, result.matches.length - 1)
    release?.()
    release = highlight_ranges(result.ranges, { css_class, disabled: !root })
  }

  // Re-search once the DOM under root settles: a panel streaming in content grows new
  // matches long after the query was typed. Returns a teardown for the caller's $effect.
  const observe = (root: Element): (() => void) => {
    const stop = observe_text_mutations(root, () => {
      if (!query.trim()) return
      const had_matches = matches.length > 0
      refresh(root)
      // Nothing matched before, so there is no cursor to preserve and the first new hit
      // is what the reader is waiting for.
      if (!had_matches && matches.length > 0) jump_to(0)
    })
    return () => {
      stop()
      jump.clear()
    }
  }

  return {
    get query(): string {
      return query
    },
    // A new query restarts navigation: a cursor into the old match set means nothing
    set query(next: string) {
      jump.clear()
      query = next
      current_idx = -1
    },
    get matches(): readonly Element[] {
      return matches
    },
    get current_idx(): number {
      return current_idx
    },
    // Empty while idle, so a live region announcing this stays quiet until there is
    // something to say
    get status(): string {
      if (!query.trim()) return ``
      if (matches.length === 0) return `No matches`
      return `${Math.max(0, current_idx) + 1} of ${matches.length}`
    },
    jump_to,
    step,
    refresh,
    observe,
    // Teardown for the $effect that calls refresh: drops this owner's ranges from the
    // shared highlight registry.
    release_highlight: (): void => {
      release?.()
      release = undefined
    },
  }
}

export type FindState = ReturnType<typeof create_find_state>
