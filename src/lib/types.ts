export type Option = string | number | ObjectOption

// single CSS string or an object with keys 'option' and 'selected', each a string,
// which only apply to the dropdown list and list of selected options, respectively
export type OptionStyle = string | { option: string; selected: string }

export type ObjectOption = {
  label: string | number // user-displayed text
  value?: unknown // associated value, can be anything incl. objects (defaults to label if undefined)
  title?: string // on-hover tooltip
  disabled?: boolean // make this option unselectable
  preselected?: boolean // make this option selected on page load (before any user interaction)
  disabledTitle?: string // override the default disabledTitle = 'This option is disabled'
  selectedTitle?: string // tooltip to display when this option is selected and hovered
  style?: OptionStyle
  [key: string]: unknown // allow any other keys users might want
}
