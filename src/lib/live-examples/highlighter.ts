import {
  type StarryNight,
  create_highlighter,
  optional_peer_error,
  render_block,
} from './create-highlighter.ts'

// The common bundle of 34 grammars plus Svelte, which ships separately. This `common`
// read lives here rather than in create-highlighter.ts because starry-night's index
// re-exports the bundle with no subpath to reach it on its own, so mentioning it there
// would pin ~1.3 MB into the chunk of every consumer that brings its own grammars.
const load_default_grammars = async () => {
  try {
    const [{ common }, { default: svelte_grammar }] = await Promise.all([
      import(`@wooorm/starry-night`),
      import(`@wooorm/starry-night/source.svelte`),
    ])
    return [...common, svelte_grammar]
  } catch (cause) {
    throw new Error(optional_peer_error, { cause })
  }
}

// Shared instance, grammars loaded once at build time
export const starry_night: StarryNight = await create_highlighter(
  await load_default_grammars(),
).ready()

export const starry_night_highlighter = (code: string, lang?: string | null): string =>
  render_block(starry_night, code, lang)
