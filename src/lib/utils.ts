import type { Option, OptionStyle } from './types'

// get the label key from an option object or the option itself if it's a string or number
export const get_label = (opt: Option) => {
  if (opt instanceof Object) {
    if (opt.label === undefined) {
      console.error(
        `MultiSelect option ${JSON.stringify(
          opt,
        )} is an object but has no label key`,
      )
    }
    return opt.label
  }
  return `${opt}`
}

export function get_style(
  option: { style?: OptionStyle; [key: string]: unknown } | string | number,
  key: 'selected' | 'option' | null = null,
) {
  if (!option?.style) return null
  if (![`selected`, `option`, null].includes(key)) {
    console.error(`MultiSelect: Invalid key=${key} for get_style`)
    return
  }
  if (typeof option == `object` && option.style) {
    if (typeof option.style == `string`) {
      return option.style
    }
    if (typeof option.style == `object`) {
      if (key && key in option.style) return option.style[key]
      else {
        console.error(
          `Invalid style object for option=${JSON.stringify(option)}`,
        )
      }
    }
  }
}
