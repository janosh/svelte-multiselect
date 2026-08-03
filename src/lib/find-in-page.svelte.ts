// Reactive find state: query, matches, current hit, highlights, and mutation observer.
// Custom chrome should call refresh and observe from separate effects so query updates
// do not restart the observer.

import { untrack } from 'svelte'
import {
  create_search_jump,
  highlight_ranges,
  observe_text_mutations,
  search_text,
  type TextMatch,
} from './text-search'

// Invisible in the UI, where hits would scroll nowhere. search_text already skips
// script/style/[hidden]/controls.
export const IGNORED_SELECTOR = `[aria-hidden="true"], .sr-only`

export type FindOptions = {
  // CSS Custom Highlight name; shared names union their ranges in the registry.
  css_class?: string
  // Limit matches to these selectors when only a few regions amid open-ended chrome
  // are searchable.
  only_within?: string
  // Further selectors to exclude, on top of IGNORED_SELECTOR rather than instead of it
  also_ignore?: string
  // Called with the trimmed query before search; hide non-matches here because
  // search_text skips [hidden].
  before_search?: (query: string) => void
}

// Getter keeps caller props live rather than freezing a creation-time snapshot.
export const create_find_state = (get_options: () => FindOptions = () => ({})) => {
  const make_node_filter = () => {
    const { only_within, also_ignore } = get_options()
    const selector = also_ignore
      ? `${IGNORED_SELECTOR}, ${also_ignore}`
      : IGNORED_SELECTOR
    return (node: Node): number => {
      const parent = node.parentElement
      if (only_within && !parent?.closest(only_within)) return NodeFilter.FILTER_REJECT
      return parent?.closest(selector)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
    }
  }

  let query = $state(``)
  // One per hit; search_text.matches is element-deduped and would skip later same-element hits.
  let occurrences = $state<TextMatch[]>([])
  let current_idx = $state(-1)
  let release: (() => void) | undefined
  const jump = create_search_jump()

  // Wraps at both ends, for any idx: `% length` alone goes negative below -length
  const jump_to = (idx: number): void => {
    const count = occurrences.length
    if (count === 0) return
    current_idx = ((idx % count) + count) % count
    const match = occurrences[current_idx]?.element
    // Open collapsed <details> ancestors so the match can scroll into view.
    let collapsed = match?.closest<HTMLDetailsElement>(`details:not([open])`) ?? null
    while (collapsed) {
      collapsed.open = true
      collapsed =
        collapsed.parentElement?.closest<HTMLDetailsElement>(`details:not([open])`) ??
        null
    }
    jump.start(match ?? null)
  }

  // Without a cursor, forward starts first and backward wraps to last.
  const step = (direction: -1 | 1): void =>
    jump_to(current_idx < 0 && direction < 0 ? -1 : current_idx + direction)

  // Pass root per call so late-mounted/swapped containers are never searched stale.
  const refresh = (root?: Element | null): void => {
    const { css_class = `find-match`, before_search } = get_options()
    before_search?.(query.trim())
    // Avoid retriggering caller effects on our writes. Ranges are rebuilt, so preserve
    // cursor by element and ordinal within it rather than range identity.
    const [previous, previous_idx, ordinal_within_element] = untrack(() => {
      const current = occurrences[current_idx]
      const ordinal = current
        ? occurrences
            .slice(0, current_idx)
            .filter((hit) => hit.element === current.element).length
        : 0
      return [current, current_idx, ordinal] as const
    })
    const result = root
      ? search_text(root, query, { node_filter: make_node_filter() })
      : { ranges: [], occurrences: [] }
    occurrences = result.occurrences
    // Keep the same hit across re-search when it survives.
    const same_element = result.occurrences.flatMap((hit, hit_idx) =>
      previous && hit.element === previous.element ? [hit_idx] : [],
    )
    const preserved_idx =
      same_element[Math.min(ordinal_within_element, same_element.length - 1)]
    current_idx = preserved_idx ?? Math.min(previous_idx, result.occurrences.length - 1)
    release?.()
    release = highlight_ranges(result.ranges, { css_class, disabled: !root })
  }

  // Re-search after DOM mutations settle; returns an effect teardown.
  const observe = (root: Element): (() => void) => {
    const stop = observe_text_mutations(root, () => {
      if (!query.trim()) return
      const had_matches = occurrences.length > 0
      refresh(root)
      // First matches after empty: select the first new hit.
      if (!had_matches && occurrences.length > 0) jump_to(0)
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
    // New query invalidates the old cursor.
    set query(next: string) {
      jump.clear()
      query = next
      current_idx = -1
    },
    // All hits in document order, one entry per hit.
    get occurrences(): readonly TextMatch[] {
      return occurrences
    },
    // Elements aligned with occurrences, repeated per hit; not search_text.matches.
    get matches(): readonly Element[] {
      return occurrences.map((hit) => hit.element)
    },
    get current_idx(): number {
      return current_idx
    },
    // Empty while idle so aria-live stays quiet.
    get status(): string {
      if (!query.trim()) return ``
      if (occurrences.length === 0) return `No matches`
      return `${Math.max(0, current_idx) + 1} of ${occurrences.length}`
    },
    jump_to,
    step,
    refresh,
    observe,
    // refresh effect teardown: drop this owner's ranges from the shared registry.
    release_highlight: (): void => {
      release?.()
      release = undefined
    },
  }
}

export type FindState = ReturnType<typeof create_find_state>
