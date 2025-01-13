import type { OptionStyle } from '../types'

/**
 * This function is used extract CSS strings from a {selected, option} style object to be used in the style attribute of the option.
 * If the style is a string, it will be returned as is
 * @param option Option
 * @param key
 * @returns CSS string
 */
export function get_style(
  option: { style?: OptionStyle; [key: string]: unknown } | string | number,
  key: `selected` | `option` | null = null,
) {
  let css_str = ``
  if (![`selected`, `option`, null].includes(key)) {
    console.error(`MultiSelect: Invalid key=${key} for get_style`)
  }
  if (typeof option == `object` && option.style) {
    if (typeof option.style == `string`) {
      css_str = option.style
    }
    if (typeof option.style == `object`) {
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
