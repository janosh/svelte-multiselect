export { default } from './MultiSelect.svelte'

export type Option = string | number | ObjectOption

export type ObjectOption = {
  label: string | number // user-displayed text
  value: string | number // associated value
  title?: string // on-hover tooltip
  disabled?: boolean // make this option unselectable
  preselected?: boolean // make this option selected on load (before any user interaction)
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
