// Live examples - transforms ```svelte example code blocks into rendered components
// with syntax highlighting and live preview
// Types only: this barrel also exports `starry_night`, whose top-level await compiles
// the 34-grammar common bundle, so re-exporting the factory here would hand consumers a
// route that silently costs them the very thing it exists to avoid. It lives at the
// `svelte-widgets/live-examples/create-highlighter` subpath instead.
export type { Grammar, Highlighter, StarryNight } from './create-highlighter.ts'
export { hast_to_html } from './hast.ts'
export { starry_night, starry_night_highlighter } from './highlighter.ts'
export {
  default as mdsvex_transform,
  EXAMPLE_COMPONENT_PREFIX,
  EXAMPLE_MODULE_PREFIX,
} from './mdsvex-transform.ts'
export { default as vite_plugin } from './vite-plugin.ts'
