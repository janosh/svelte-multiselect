export { default } from './MultiSelect.svelte'

export type Primitive = string | number | boolean

export type Option = {
  label: Primitive // text to render to the user for this option
  value?: Primitive | object // falls back on label if not set
  // IDs are used to tell options apart even if they have same label
  id?: Primitive // falls back on label if not set
  title?: string // tooltip to display on hovering this option
  disabled?: boolean // make this option unselectable
  disabledTitle?: string // override the default disabledTitle = 'This option is disabled'
  selectedTitle?: string // tooltip to display when this option is selected and hovered
  [key: string]: unknown // allow devs to include any other key they might want
}

// internally used option type with mandatory id and value set to label if not supplied by user
export type _Option = Omit<Option, `id` | `value`> & {
  id: Primitive
  value: Primitive
}
