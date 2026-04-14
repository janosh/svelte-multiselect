import type { Option } from './types'

let uuid_counter = 0

// Generates a UUID for component IDs. Uses native crypto.randomUUID when available.
// Fallback uses timestamp+counter - sufficient for DOM IDs (uniqueness, not security).
// Cryptographic randomness is unnecessary here since these IDs are only used for
// associating labels with inputs and ensuring unique DOM element identifiers.
export function get_uuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const hex = (Date.now().toString(16) + (uuid_counter++).toString(16)).padStart(32, `0`)
  return hex.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, `$1-$2-$3-$4-$5`)
}

// Type guard for checking if a value is a non-null object
export const is_object = (val: unknown): val is Record<string, unknown> =>
  typeof val === `object` && val !== null

// Type guard for checking if an option has a group key
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

// Generate a unique key for an option, preserving value identity
// For object options: uses value if defined, otherwise label (no case normalization)
// For primitives: the primitive itself
export const get_option_key = (opt: Option): unknown =>
  is_object(opt) ? (opt.value ?? get_label(opt)) : opt

// This function is used extract CSS strings from a {selected, option} style
// object to be used in the style attribute of the option.
// If the style is a string, it will be returned as is
export function get_style(
  option: Option,
  key: `selected` | `option` | null | undefined = null,
) {
  if (key === undefined) key = null
  let css_str = ``
  const valid_key = key === null || key === `selected` || key === `option`
  if (!valid_key) console.error(`MultiSelect: Invalid key=${key} for get_style`)
  if (typeof option === `object` && option.style) {
    if (typeof option.style === `string`) css_str = option.style
    if (typeof option.style === `object`) {
      if (key && key in option.style) return option.style[key] ?? ``
      else if (key) console.error(`MultiSelect: invalid style object for option`, option)
    }
  }
  // ensure css_str ends with a semicolon
  if (css_str.trim() && !css_str.trim().endsWith(`;`)) css_str += `;`
  return css_str
}

// Parse shortcut string into modifier+key parts
export function parse_shortcut(shortcut: string): {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
} {
  const parts = shortcut
    .toLowerCase()
    .split(`+`)
    .map((part) => part.trim())
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
    event.shiftKey === shift &&
    event.altKey === alt &&
    event.metaKey === meta
  )
}

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

// Fuzzy string matching function
// Returns true if the search string can be found as a subsequence in the target string
// e.g., "tageoo" matches "tasks/geo-opt" because t-a-g-e-o-o appears in order
export function fuzzy_match(search_text: string, target_text: string): boolean {
  // Handle null/undefined inputs first
  if (
    search_text === null ||
    search_text === undefined ||
    target_text === null ||
    target_text === undefined
  )
    return false

  if (!search_text) return true
  if (!target_text) return false

  const [search, target] = [search_text.toLowerCase(), target_text.toLowerCase()]

  let [search_idx, target_idx] = [0, 0]

  while (search_idx < search.length && target_idx < target.length) {
    if (search[search_idx] === target[target_idx]) search_idx++
    target_idx++
  }

  return search_idx === search.length
}
