export { default } from './MultiSelect.svelte'

export type Primitive = string | number

export type Option = {
  label: Primitive // text to render to the user for this option
  value: Primitive // falls back on label if not set
  title?: string // tooltip to display on hovering this option
  disabled?: boolean // make this option unselectable
  preselected?: boolean // make this option selected on load (before any user interaction)
  disabledTitle?: string // override the default disabledTitle = 'This option is disabled'
  selectedTitle?: string // tooltip to display when this option is selected and hovered
  [key: string]: unknown // allow any other keys users might want
}

// a proto option is more flexible than an option but can be auto-converted
// allows users to pass in simple strings/numbers as options or objects with
// only labels which are then also used as values
export type ProtoOption =
  | Primitive
  | (Omit<Option, `value`> & {
      value?: Primitive
    })

export type DispatchEvents = {
  add: { option: Option }
  remove: { option: Option }
  removeAll: { options: Option[] }
  change: {
    option?: Option
    options?: Option[]
    type: 'add' | 'remove' | 'removeAll'
  }
  blur: undefined
}
