import type { Snippet } from 'svelte'
import type { HTMLAttributes, HTMLInputAttributes } from 'svelte/elements'

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

// custom events created by MultiSelect
export interface MultiSelectEvents<T extends Option = Option> {
  onadd?: (data: { option: T }) => unknown
  oncreate?: (data: { option: T }) => unknown // fires when users entered custom text from which new option is created
  onremove?: (data: { option: T }) => unknown
  onremoveAll?: (data: { options: T[] }) => unknown
  onselectAll?: (data: { options: T[] }) => unknown // fires when select all is triggered
  onchange?: (data: {
    option?: T
    options?: T[]
    type: `add` | `remove` | `removeAll` | `selectAll`
  }) => unknown
  onopen?: (data: { event: Event }) => unknown
  onclose?: (data: { event: Event }) => unknown
}

type AfterInputProps = Pick<
  MultiSelectProps,
  `selected` | `disabled` | `invalid` | `id` | `placeholder` | `open` | `required`
>
type UserMsgProps = {
  searchText: string
  msgType: false | `dupe` | `create` | `no-match`
  msg: null | string
}

export interface MultiSelectSnippets<T extends Option = Option> {
  expandIcon?: Snippet<[{ open: boolean }]>
  selectedItem?: Snippet<[{ option: T; idx: number }]>
  children?: Snippet<[{ option: T; idx: number }]>
  removeIcon?: Snippet
  afterInput?: Snippet<[AfterInputProps]>
  spinner?: Snippet
  disabledIcon?: Snippet
  option?: Snippet<[{ option: T; idx: number }]>
  userMsg?: Snippet<[UserMsgProps]>
}

export interface PortalParams {
  target_node?: HTMLElement | null
  active?: boolean
}

export interface MultiSelectProps<T extends Option = Option>
  extends
    MultiSelectEvents<T>,
    MultiSelectSnippets<T>,
    Omit<HTMLAttributes<HTMLDivElement>, `children` | `onchange` | `onclose`> {
  activeIndex?: number | null
  activeOption?: T | null
  createOptionMsg?: string | null
  allowUserOptions?: boolean | `append`
  allowEmpty?: boolean // added for https://github.com/janosh/svelte-multiselect/issues/192
  autocomplete?: HTMLInputAttributes[`autocomplete`]
  autoScroll?: boolean
  breakpoint?: number // any screen with more horizontal pixels is considered desktop, below is mobile
  defaultDisabledTitle?: string
  disabled?: boolean
  disabledInputTitle?: string
  duplicateOptionMsg?: string
  duplicates?: boolean // whether to allow duplicate options
  // keepSelectedInDropdown controls whether selected options remain in dropdown: false (default),
  // 'plain' (left border and background color to differentiate selected options),
  // 'checkboxes' (each option is prefixed by a checkbox).
  keepSelectedInDropdown?: false | `plain` | `checkboxes`
  // case-insensitive equality comparison after string coercion and looks only at the `label` key of object options by default
  key?: (opt: T) => unknown
  filterFunc?: (opt: T, searchText: string) => boolean
  fuzzy?: boolean // whether to use fuzzy matching (default: true) or substring matching (false)
  closeDropdownOnSelect?: boolean | `if-mobile` | `retain-focus`
  form_input?: HTMLInputElement | null
  highlightMatches?: boolean
  id?: string | null
  input?: HTMLInputElement | null
  inputClass?: string
  inputStyle?: string | null
  inputmode?: HTMLInputAttributes[`inputmode`] | null
  invalid?: boolean
  liActiveOptionClass?: string
  liActiveUserMsgClass?: string
  liOptionClass?: string
  liOptionStyle?: string | null
  liSelectedClass?: string
  liSelectedStyle?: string | null
  liUserMsgClass?: string
  loading?: boolean
  matchingOptions?: T[]
  maxOptions?: number | undefined
  maxSelect?: number | null // null means there is no upper limit for selected.length
  maxSelectMsg?: ((current: number, max: number) => string) | null
  maxSelectMsgClass?: string
  name?: string | null
  noMatchingOptionsMsg?: string
  open?: boolean
  options: T[]
  outerDiv?: HTMLDivElement | null
  outerDivClass?: string
  parseLabelsAsHtml?: boolean // should not be combined with allowUserOptions!
  pattern?: string | null
  placeholder?: string | null
  removeAllTitle?: string
  removeBtnTitle?: string
  minSelect?: number | null // null means there is no lower limit for selected.length
  required?: boolean | number
  resetFilterOnAdd?: boolean
  searchText?: string
  selected?: T[] // don't allow more than maxSelect preselected options
  sortSelected?: boolean | ((op1: T, op2: T) => number)
  selectedOptionsDraggable?: boolean
  style?: string | null
  ulOptionsClass?: string
  ulSelectedClass?: string
  ulSelectedStyle?: string | null
  ulOptionsStyle?: string | null
  value?: T | T[] | null
  portal?: PortalParams
  // Select all feature
  selectAllOption?: boolean | string // enable select all; if string, use as label
  liSelectAllClass?: string // CSS class for the select all <li>
}
