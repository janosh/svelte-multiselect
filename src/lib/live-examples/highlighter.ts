import { type HastNode, escape_html_text, hast_to_html } from './hast.ts'

type StarryNight = {
  flagToScope: (flag: string) => string | undefined
  highlight: (value: string, scope: string) => HastNode
}

const optional_peer_error = `svelte-multiselect/live-examples requires optional peer dependency @wooorm/starry-night`

// Starry-night highlighter for mdsvex
async function create_starry_night(): Promise<StarryNight> {
  try {
    const [{ common, createStarryNight }, { default: source_svelte }] = await Promise.all(
      [import(`@wooorm/starry-night`), import(`@wooorm/starry-night/source.svelte`)],
    )
    return await createStarryNight([...common, source_svelte])
  } catch (cause) {
    throw new Error(optional_peer_error, { cause })
  }
}

// Escape characters that would be interpreted as Svelte template syntax
const escape_svelte = (html: string): string =>
  html.replaceAll(`{`, `&#123;`).replaceAll(`}`, `&#125;`)

// Shared starry-night instance (grammars loaded once at build time)
// Uses common bundle (34 grammars) + Svelte
export const starry_night = await create_starry_night()

// mdsvex highlighter function
export function starry_night_highlighter(code: string, lang?: string | null): string {
  const lang_key = lang?.toLowerCase()
  const scope = lang_key ? starry_night.flagToScope(lang_key) : undefined
  // fall back to plain escaped code when the language is missing or unsupported
  const html = scope
    ? escape_svelte(hast_to_html(starry_night.highlight(code, scope)))
    : escape_svelte(escape_html_text(code))
  const class_name = scope ? `highlight highlight-${lang_key}` : `highlight`
  return `<pre class="${class_name}"><code>${html}</code></pre>`
}
