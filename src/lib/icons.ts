// Icon set shared across janosh's Svelte projects. One `export const` per glyph so
// bundlers keep only what a call site imports; one object of all glyphs would pin the set.
// Import the value and pass it: `import { Info } from 'svelte-widgets/icons'` then
// `<Icon icon={Info} />`. `custom` is hand-maintained; `generated` comes from
// scripts/icons-manifest.ts via `pnpm gen:icons`.
export type { IconData } from './icons/types'
export * from './icons/custom'
export * from './icons/generated'
