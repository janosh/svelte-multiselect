import type { Snippet } from 'svelte'
import type {
  FocusEventHandler,
  HTMLInputAttributes,
  KeyboardEventHandler,
  MouseEventHandler,
  TouchEventHandler,
} from 'svelte/elements'
import type { Option } from './types'

export interface MultiSelectNativeEvents {
  onblur?: FocusEventHandler<HTMLInputElement>
  onclick?: MouseEventHandler<HTMLInputElement>
  // onchange?: ChangeEventHandler<HTMLInputElement> TBD
  onfocus?: FocusEventHandler<HTMLInputElement>
  onkeydown?: KeyboardEventHandler<HTMLInputElement>
  onkeyup?: KeyboardEventHandler<HTMLInputElement>
  onmousedown?: MouseEventHandler<HTMLInputElement>
  onmouseenter?: MouseEventHandler<HTMLInputElement>
  onmouseleave?: MouseEventHandler<HTMLInputElement>
  ontouchcancel?: TouchEventHandler<HTMLInputElement>
  ontouchend?: TouchEventHandler<HTMLInputElement>
  ontouchmove?: TouchEventHandler<HTMLInputElement>
  ontouchstart?: TouchEventHandler<HTMLInputElement>
}

export interface MultiSelectComponentEvents<T extends Option = Option> {
  onadd?: (data: { option: T }) => unknown
  oncreate?: (data: { option: T }) => unknown
  onremove?: (data: { option: T }) => unknown
  onremoveAll?: (data: { options: T[] }) => unknown
  onchange?: (data: {
    option?: T
    options?: T[]
    type: `add` | `remove` | `removeAll`
  }) => unknown
  onopen?: (data: { event: Event }) => unknown
  onclose?: (data: { event: Event }) => unknown
}

export interface MultiSelectSnippets<T extends Option = Option> {
  expandIcon?: Snippet<[{ open: boolean }]>
  selectedItem?: Snippet<[{ option: T; idx: number }]>
  children?: Snippet<[{ option: T; idx: number }]>
  removeIcon?: Snippet
  afterInput?: Snippet<
    [
      Pick<
        MultiSelectParameters,
        | `selected`
        | `disabled`
        | `invalid`
        | `id`
        | `placeholder`
        | `open`
        | `required`
      >,
    ]
  >
  spinner?: Snippet
  disabledIcon?: Snippet
  option?: Snippet<[{ option: T; idx: number }]>
  userMsg?: Snippet<
    [
      {
        searchText: string
        msgType: false | `dupe` | `create` | `no-match`
        msg: null | string
      },
    ]
  >
}

export interface MultiSelectParameters<T extends Option = Option> {
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
  // prettier-ignore
  duplicateOptionMsg?: string;
  duplicates?: boolean // whether to allow duplicate options
  // case-insensitive equality comparison after string coercion and looks only at the `label` key of object options by default
  key?: (opt: T) => unknown
  filterFunc?: (opt: T, searchText: string) => boolean
  closeDropdownOnSelect?: boolean | `desktop`
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
  [key: string]: unknown
}

export interface MultiSelectProps<T extends Option = Option>
  extends MultiSelectNativeEvents,
    MultiSelectComponentEvents<T>,
    MultiSelectSnippets<T>,
    MultiSelectParameters<T> {}
