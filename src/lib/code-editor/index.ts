// Backend-agnostic code rendering primitives and DiffView. Import
// `svelte-widgets/code-editor/editor.css` alongside rendered code: the token colors
// and shared line metrics live there.

export { default as DiffView } from './DiffView.svelte'
export * from './edit-ops'
export * from './text-delta'
export * from './tokens'
export * from './types'
