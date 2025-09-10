import type { Option } from './types'

// Get the label key from an option object or the option itself
// if it's a string or number
export const get_label = (opt: Option) => {
  if (opt instanceof Object) {
    if (opt.label === undefined) {
      const opt_str = JSON.stringify(opt)
      console.error(`MultiSelect option ${opt_str} is an object but has no label key`)
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
        console.error(
          `Invalid style object for option=${JSON.stringify(option)}`,
        )
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
