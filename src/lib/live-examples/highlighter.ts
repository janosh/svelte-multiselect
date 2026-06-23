// Starry-night highlighter for mdsvex
import { common, createStarryNight } from '@wooorm/starry-night'
import source_svelte from '@wooorm/starry-night/source.svelte'
import { escape_html_text, hast_to_html } from './hast.ts'

// Escape characters that would be interpreted as Svelte template syntax
const escape_svelte = (html: string): string =>
  html.replaceAll(`{`, `&#123;`).replaceAll(`}`, `&#125;`)

// Shared starry-night instance (grammars loaded once at build time)
// Uses common bundle (34 grammars) + Svelte
export const starry_night = await createStarryNight([...common, source_svelte])

// mdsvex highlighter function
export function starry_night_highlighter(code: string, lang?: string | null): string {
  const lang_key = lang?.toLowerCase()
  const scope = lang_key ? starry_night.flagToScope(lang_key) : undefined
  if (!scope) {
    // Return escaped code if language not supported
    const escaped = escape_svelte(escape_html_text(code))
    return `<pre class="highlight"><code>${escaped}</code></pre>`
  }
  const tree = starry_night.highlight(code, scope)
  const html = escape_svelte(hast_to_html(tree))
  return `<pre class="highlight highlight-${lang_key}"><code>${html}</code></pre>`
}
