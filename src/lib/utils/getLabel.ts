import type { Option } from '../types'

/**
 * Get the label key from an option object or the option itself if it's a string or number
 * @param opt Option
 * @returns Label
 */
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
