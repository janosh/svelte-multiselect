import type { Option } from './types'

// Generates a cryptographically secure RFC 4122 v4 UUID
// Uses native randomUUID in secure contexts, falls back to getRandomValues for HTTP
export function get_uuid(): string {
  if (globalThis.isSecureContext && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error(`crypto.getRandomValues not available`)
  }
  const buf = new Uint8Array(16)
  globalThis.crypto.getRandomValues(buf)
  // Set version (4) and variant (RFC 4122) bits
  buf[6] = (buf[6] & 0x0f) | 0x40
  buf[8] = (buf[8] & 0x3f) | 0x80
  const hex = [...buf].map((b) => b.toString(16).padStart(2, `0`)).join(``)
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
      else {
        console.error(`MultiSelect: invalid style object for option`, option)
      }
    }
  }
  // ensure css_str ends with a semicolon
  if (css_str.trim() && !css_str.trim().endsWith(`;`)) css_str += `;`
  return css_str
}

// Fuzzy string matching function
// Returns true if the search string can be found as a subsequence in the target string
// e.g., "tageoo" matches "tasks/geo-opt" because t-a-g-e-o-o appears in order
export function fuzzy_match(search_text: string, target_text: string): boolean {
  // Handle null/undefined inputs first
  if (
    search_text === null || search_text === undefined || target_text === null ||
    target_text === undefined
  ) return false

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
