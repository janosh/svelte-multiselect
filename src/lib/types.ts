import type { Snippet } from 'svelte'
import type { FlipParams } from 'svelte/animate'
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
  group?: string // optional group name for grouping options in dropdown
  [key: string]: unknown // allow any other keys users might want
}

// placeholder can be a simple string or object with extended options
export type PlaceholderConfig = {
  text: string
  persistent?: boolean // keep placeholder visible even when options are selected
}

// custom events created by MultiSelect
export interface MultiSelectEvents<T extends Option = Option> {
  onadd?: (data: { option: T }) => unknown
  oncreate?: (data: { option: T }) => unknown // fires when users entered custom text from which new option is created
  onremove?: (data: { option: T }) => unknown
  onremoveAll?: (data: { options: T[] }) => unknown
  onselectAll?: (data: { options: T[] }) => unknown // fires when select all is triggered
  onreorder?: (data: { options: T[] }) => unknown // fires when selected options are reordered via drag-and-drop
  onchange?: (data: {
    option?: T
    options?: T[]
    type: `add` | `remove` | `removeAll` | `selectAll` | `reorder`
  }) => unknown
  onopen?: (data: { event: Event }) => unknown
  onclose?: (data: { event: Event }) => unknown
  ongroupToggle?: (data: { group: string; collapsed: boolean }) => unknown // fires when group is collapsed/expanded
  oncollapseAll?: (data: { groups: string[] }) => unknown // fires when all groups are collapsed
  onexpandAll?: (data: { groups: string[] }) => unknown // fires when all groups are expanded
  // Additional events for user feedback and analytics
  onsearch?: (data: { searchText: string; matchingCount: number }) => unknown // fires (debounced) when search text changes
  onmaxreached?: (
    data: { selected: T[]; maxSelect: number; attemptedOption: T },
  ) => unknown // fires when user tries to exceed maxSelect
  onduplicate?: (data: { option: T }) => unknown // fires when user tries to add duplicate (when duplicates=false)
  onactivate?: (data: { option: T | null; index: number | null }) => unknown // fires on keyboard navigation through options
}

// Dynamic options loading (https://github.com/janosh/svelte-multiselect/discussions/342)
export interface LoadOptionsParams {
  search: string
  offset: number
  limit: number
}

export interface LoadOptionsResult<T extends Option = Option> {
  options: T[]
  hasMore: boolean
}

export type LoadOptionsFn<T extends Option = Option> = (
  params: LoadOptionsParams,
) => Promise<LoadOptionsResult<T>>

export interface LoadOptionsConfig<T extends Option = Option> {
  fetch: LoadOptionsFn<T>
  debounceMs?: number // default: 300
  batchSize?: number // default: 50
  onOpen?: boolean // default: true
}

export type LoadOptions<T extends Option = Option> =
  | LoadOptionsFn<T>
  | LoadOptionsConfig<T>

type AfterInputProps = Pick<
  MultiSelectProps,
  `selected` | `disabled` | `invalid` | `id` | `placeholder` | `open` | `required`
>
type UserMsgProps = {
  searchText: string
  msgType: false | `dupe` | `create` | `no-match`
  msg: null | string
}
export type GroupHeaderProps<T extends Option = Option> = {
  group: string
  options: T[]
  collapsed: boolean
}

// Type for grouped options structure (used internally by MultiSelect)
export type GroupedOptions<T extends Option = Option> = {
  group: string | null
  options: T[]
  collapsed: boolean
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
  groupHeader?: Snippet<[GroupHeaderProps<T>]> // custom group header rendering
}

export interface PortalParams {
  target_node?: HTMLElement | null
  active?: boolean
}

export interface MultiSelectProps<T extends Option = Option>
  extends
    MultiSelectEvents<T>,
    MultiSelectSnippets<T>,
    Omit<
      HTMLAttributes<HTMLDivElement>,
      `children` | `onchange` | `onclose` | `placeholder`
    > {
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
  options?: T[] // static options, or omit when using loadOptions
  outerDiv?: HTMLDivElement | null
  outerDivClass?: string
  parseLabelsAsHtml?: boolean // should not be combined with allowUserOptions!
  pattern?: string | null
  placeholder?: string | PlaceholderConfig | null
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
  // Dynamic options loading for large datasets (https://github.com/janosh/svelte-multiselect/discussions/342)
  // Pass a function for simple usage, or an object with config for advanced usage
  loadOptions?: LoadOptions<T>
  // Animation parameters for selected options flip animation (https://github.com/janosh/svelte-multiselect/issues/356)
  // Set { duration: 0 } to disable animation
  selectedFlipParams?: FlipParams
  // Option grouping feature (https://github.com/janosh/svelte-multiselect/issues/135)
  collapsibleGroups?: boolean // enable click-to-collapse groups
  collapsedGroups?: Set<string> // externally controlled collapsed state (bindable)
  groupSelectAll?: boolean // add "select all" action per group header (toggles between select/deselect)
  ungroupedPosition?: `first` | `last` // where to render options without a group
  groupSortOrder?: `none` | `asc` | `desc` | ((a: string, b: string) => number) // sort groups alphabetically
  searchExpandsCollapsedGroups?: boolean // auto-expand collapsed groups when search matches their options
  searchMatchesGroups?: boolean // include group name in search matching
  keyboardExpandsCollapsedGroups?: boolean // auto-expand collapsed groups when navigating with arrow keys
  stickyGroupHeaders?: boolean // keep group headers visible at top when scrolling
  liGroupHeaderClass?: string // CSS class for group header <li>
  liGroupHeaderStyle?: string | null // inline style for group headers
  // Programmatic group control (exposed via bindable)
  collapseAllGroups?: () => void
  expandAllGroups?: () => void
  // Keyboard shortcuts for common actions
  shortcuts?: Partial<KeyboardShortcuts>
}

// Keyboard shortcuts for MultiSelect actions.
// Shortcut format: "modifier+...+key" where modifiers can be: ctrl, shift, alt, meta, cmd
// Examples: 'ctrl+a', 'ctrl+shift+a', 'meta+a', 'cmd+a', 'alt+s'
// Set to null to disable a shortcut.
//
// PRECEDENCE: Custom shortcuts are evaluated BEFORE built-in key handlers (Enter, Escape,
// ArrowUp/Down, Backspace). This means if you set shortcuts={{ open: 'enter' }}, the Enter
// key will open the dropdown instead of selecting the active option (intentional to allow full customization).
export interface KeyboardShortcuts {
  select_all?: string | null // default: 'ctrl+a'
  clear_all?: string | null // default: 'ctrl+shift+a'
  open?: string | null // default: null (use existing behavior)
  close?: string | null // default: null (Escape already works)
}

// Nav component types
export interface NavRouteObject {
  href: string
  label?: string // custom label (default: derived from href)
  children?: string[] // sub-routes for dropdown
  disabled?: boolean | string // true or tooltip message
  separator?: boolean // render as visual divider after this item
  align?: `left` | `right` // default: `left`
  external?: boolean // add target="_blank" rel="noopener noreferrer"
  class?: string // custom CSS class
  style?: string // custom inline style
  [key: string]: unknown // allow additional custom properties
}

// NavRoute supports multiple formats for backward compatibility:
// - string: just a path ("/about")
// - [string, string]: [path, custom_label] ("/about", "About Us")
// - [string, string[]]: [parent_path, child_paths] ("/docs", ["/docs/intro"])
// - NavRouteObject: full object with all options
export type NavRoute = string | [string, string] | [string, string[]] | NavRouteObject
