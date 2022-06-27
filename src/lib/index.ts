export { default } from './MultiSelect.svelte'

export type Option = string | number | ObjectOption

export type ObjectOption = {
  label: string | number // user-displayed text
  value?: unknown // associated value, can be anything incl. objects (defaults to label if undefined)
  title?: string // on-hover tooltip
  disabled?: boolean // make this option unselectable
  preselected?: boolean // make this option selected on page load (before any user interaction)
  disabledTitle?: string // override the default disabledTitle = 'This option is disabled'
  selectedTitle?: string // tooltip to display when this option is selected and hovered
  [key: string]: unknown // allow any other keys users might want
}

export type DispatchEvents = {
  add: { option: Option }
  remove: { option: Option }
  removeAll: { options: Option[] }
  change: {
    option?: Option
    options?: Option[]
    type: 'add' | 'remove' | 'removeAll'
  }
  focus: undefined
  blur: undefined
}

export type CustomEvents = {
  [key in keyof DispatchEvents]: CustomEvent<DispatchEvents[key]>
}

// get the label key from an option object or the option itself if it's a string or number
export const get_label = (op: Option) => (op instanceof Object ? op.label : op)

// fallback on label if option is object and value is undefined
export const get_value = (op: Option) =>
  op instanceof Object ? op.value ?? op.label : op
