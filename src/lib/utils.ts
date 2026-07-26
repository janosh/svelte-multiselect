import type { CmdAction, Option } from './types'

let uuid_counter = 0

export const chain_handlers =
  <EventType>(...handlers: (((event: EventType) => unknown) | null | undefined)[]) =>
  (event: EventType): void =>
    handlers.forEach((handler) => handler?.(event))

// Generates a UUID for component IDs. Uses native crypto.randomUUID when available.
// Fallback uses timestamp+counter - sufficient for DOM IDs (uniqueness, not security).
export function get_uuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const hex = (Date.now().toString(16) + (uuid_counter++).toString(16)).padStart(32, `0`)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join(`-`)
}

export const is_object = (val: unknown): val is Record<string, unknown> =>
  typeof val === `object` && val !== null

export const slug_to_title = (slug: string): string =>
  slug
    .replaceAll(`-`, ` `)
    .replaceAll(/(?<![\p{L}\p{M}\p{N}_])\p{L}/gu, (letter) => letter.toUpperCase())

export const has_group = <T extends Option>(opt: T): opt is T & { group: string } =>
  is_object(opt) && typeof opt.group === `string`

// Get the label key from an option object or the option itself
// if it's a string or number
export const get_label = (opt: Option) => {
  if (is_object(opt)) {
    if (opt.label === undefined) {
      const opt_str = JSON.stringify(opt)
      console.error(`MultiSelect: option is an object but has no label key`, opt_str)
    }
    return opt.label
  }
  return `${opt}`
}

// Unique option key: value ?? label for objects, the primitive itself otherwise
export const get_option_key = (opt: Option): unknown =>
  is_object(opt) ? (opt.value ?? get_label(opt)) : opt

// Extract a CSS string from an option's style (string or {option, selected} object).
// Always returns a semicolon-terminated string.
export function get_style(
  option: Option,
  key: `selected` | `option` | null | undefined = null, // undefined falls back to null via default
) {
  let css_str = ``
  if (key !== null && key !== `selected` && key !== `option`) {
    console.error(`MultiSelect: Invalid key=${String(key)} for get_style`)
    return css_str
  }
  if (typeof option === `object` && option.style) {
    if (typeof option.style === `string`) css_str = option.style
    if (typeof option.style === `object`) {
      if (key && key in option.style) css_str = option.style[key] ?? ``
      // partial style objects (e.g. only `selected`) are fine; flag any keys
      // other than the known ones, even when a valid key is also present
      const has_unknown_key = Object.keys(option.style).some(
        (style_key) => style_key !== `option` && style_key !== `selected`,
      )
      if (has_unknown_key) {
        console.error(`MultiSelect: invalid style object for option`, option)
      }
    }
  }
  const trimmed = css_str.trim()
  if (trimmed && !trimmed.endsWith(`;`)) css_str += `;`
  return css_str
}

export function split_shortcut(shortcut: string): string[] {
  const parts = shortcut
    .toLowerCase()
    .split(`+`)
    .map((part) => part.trim())

  if (parts.at(-1) === `` && parts.at(-2) === ``) parts.splice(-2, 2, `+`)
  return parts
}

// Parse shortcut string into modifier+key parts
export function parse_shortcut(shortcut: string): {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
} {
  const parts = split_shortcut(shortcut)
  const key = parts.pop() ?? ``
  const ctrl = parts.includes(`ctrl`)
  const shift = parts.includes(`shift`)
  const alt = parts.includes(`alt`)
  const meta = parts.includes(`meta`) || parts.includes(`cmd`)
  return { key, ctrl, shift, alt, meta }
}

export function matches_shortcut(
  event: KeyboardEvent,
  shortcut: string | null | undefined,
): boolean {
  if (!shortcut) return false
  const { key, ctrl, shift, alt, meta } = parse_shortcut(shortcut)
  // Require non-empty key to prevent "ctrl+" from matching any key with ctrl pressed
  if (!key) return false
  return (
    event.key.toLowerCase() === key &&
    event.ctrlKey === ctrl &&
    (event.shiftKey === shift || (key === `+` && !shift)) &&
    event.altKey === alt &&
    event.metaKey === meta
  )
}

// True when the event came from a text-entry control, where a bare key is typing
export const is_editable_event_target = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest(
    `input, textarea, select, [contenteditable]:not([contenteditable="false"])`,
  ) !== null

// Alt/Ctrl/Meta make a keystroke a chord. Shift is excluded: it types capitals.
export const is_modifier_chord = (event: KeyboardEvent): boolean =>
  event.altKey || event.ctrlKey || event.metaKey

// Compare arrays/values for equality to avoid unnecessary updates.
// Prevents infinite loops when value/selected are bound to reactive wrappers
// that clone arrays on assignment (e.g. Superforms, Svelte stores). See issue #309.
// Treats null/undefined/[] as equivalent empty states to prevent extra updates on init (#369).
export function values_equal(val1: unknown, val2: unknown): boolean {
  if (val1 === val2) return true
  const is_empty = (val: unknown) =>
    val === null || val === undefined || (Array.isArray(val) && val.length === 0)
  if (is_empty(val1) && is_empty(val2)) return true
  if (Array.isArray(val1) && Array.isArray(val2)) {
    return val1.length === val2.length && val1.every((item, idx) => item === val2[idx])
  }
  return false
}

// replaceAll rebuilds the whole string, so skip it when there is nothing to normalize
const HAS_COLLAPSIBLE_WHITESPACE = /\s\s|[^\S ]/u
const HAS_NON_PLAIN_WHITESPACE = /[^\S ]/u

// Case-insensitive subsequence match: returns the indices in target_text where
// the characters of search_text appear in order, or null if not all characters
// can be matched. An empty search matches with no indices.
export function fuzzy_match_indices(
  search_text: string,
  target_text: string,
): number[] | null {
  // collapse runs in the search; map every whitespace char in the target to a space
  let search = search_text.toLowerCase()
  if (HAS_COLLAPSIBLE_WHITESPACE.test(search)) search = search.replaceAll(/\s+/gu, ` `)
  let target = target_text.toLowerCase()
  if (HAS_NON_PLAIN_WHITESPACE.test(target)) target = target.replaceAll(/\s/gu, ` `)

  // Greedy leftmost match; pos only moves forward, so scanning stays linear.
  const indices: number[] = []
  let pos = -1
  // by code unit, not for...of: code points emit one index per astral char, two expected
  // oxlint-disable-next-line typescript/prefer-for-of
  for (let search_idx = 0; search_idx < search.length; search_idx++) {
    pos = target.indexOf(search[search_idx], pos + 1)
    if (pos === -1) return null
    indices.push(pos)
  }
  return indices
}

// True if search is a subsequence of target, e.g. "tageoo" matches "tasks/geo-opt"
export function fuzzy_match(search_text: string, target_text: string): boolean {
  // guard null/undefined inputs (fuzzy_match_indices would throw on .toLowerCase())
  if (search_text == null || target_text == null) return false
  // empty search matches everything, empty target matches nothing - both already
  // handled by fuzzy_match_indices (empty search -> [], else vs empty target -> null)
  return fuzzy_match_indices(search_text, target_text) !== null
}

export const format_cmd_metadata = (metadata: CmdAction[`metadata`]): string =>
  Array.isArray(metadata) ? metadata.join(` · `) : (metadata ?? ``)

export function cmd_action_matches(
  action: CmdAction,
  search: string,
  fuzzy = true,
): boolean {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const searchable_text = [
    action.label,
    action.description,
    action.badge,
    action.group,
    action.shortcut,
    action.keywords?.join(` `),
    format_cmd_metadata(action.metadata),
  ]
    .filter(Boolean)
    .join(` `)
    .toLowerCase()
  return terms.every((term) =>
    fuzzy ? fuzzy_match(term, searchable_text) : searchable_text.includes(term),
  )
}
