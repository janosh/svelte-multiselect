export { default } from './MultiSelect.svelte'

export type Primitive = string | number

export type Option = {
  label: Primitive // text to render to the user for this option
  value: Primitive // falls back on label if not set
  title?: string // tooltip to display on hovering this option
  disabled?: boolean // make this option unselectable
  disabledTitle?: string // override the default disabledTitle = 'This option is disabled'
  selectedTitle?: string // tooltip to display when this option is selected and hovered
  [key: string]: unknown // allow any other key
}

// a proto option is more flexible than an option but can be auto-converted
// allows users to pass in simple strings/numbers as options or objects with
// only labels which are then also used as values
export type ProtoOption =
  | Primitive
  | (Omit<Option, `value`> & {
      value?: Primitive
    })
