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

// Get the value from an option object, falling back to label if value is undefined
// For primitive options (string/number), returns the option itself
export const get_value = (opt: Option): unknown => {
  if (is_object(opt)) {
    // Use value if defined, otherwise fall back to label
    return opt.value !== undefined ? opt.value : opt.label
  }
  return opt
}

// Check for case-variant labels and warn developers
// Returns true if case variants were found
export const warn_case_variants = (options: Option[]): boolean => {
  const labels = options.map((o) => `${get_label(o)}`)
  const lowerLabels = labels.map((l) => l.toLowerCase())
  const seen = new Map<string, string[]>()

  labels.forEach((label, i) => {
    const lower = lowerLabels[i]
    if (!seen.has(lower)) {
      seen.set(lower, [])
    }
    seen.get(lower)!.push(label)
  })

  const variants = [...seen.entries()]
    .filter(([, labelList]) => labelList.length > 1 && new Set(labelList).size > 1)
    .map(([, labelList]) => [...new Set(labelList)].join(`, `))

  if (variants.length > 0) {
    console.warn(
      `[svelte-multiselect] Options contain labels that differ only by case: [${variants.join(`] [`)}]. ` +
      `Each will be treated as a distinct option. If this is unintended, filter your options or provide a custom key function.`
    )
    return true
  }
  return false
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
