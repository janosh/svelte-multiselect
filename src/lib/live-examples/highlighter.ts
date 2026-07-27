import {
  type StarryNight,
  create_highlighter,
  render_block,
} from './create-highlighter.ts'

// Shared starry-night instance (grammars loaded once at build time)
// Uses common bundle (34 grammars) + Svelte
export const starry_night: StarryNight = await create_highlighter().ready()

export const starry_night_highlighter = (code: string, lang?: string | null): string =>
  render_block(starry_night, code, lang)
