// Starry-night highlighter for mdsvex
import { common, createStarryNight } from '@wooorm/starry-night'
import source_svelte from '@wooorm/starry-night/source.svelte'

// Structural type compatible with hast Root/Element/Text from starry-night
interface HastNode {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

// Escape HTML special characters in text content (not for attribute values)
const escape_html_text = (str: string): string =>
  str.replaceAll(`&`, `&amp;`).replaceAll(`<`, `&lt;`).replaceAll(`>`, `&gt;`)

// Convert HAST to HTML string (simplified - only handles what starry-night outputs)
export const hast_to_html = (node: HastNode): string => {
  if (node.type === `text`) return escape_html_text(node.value ?? ``)
  if (node.type === `root`) return (node.children ?? []).map(hast_to_html).join(``)
  const { tagName, properties, children } = node
  const cls_val = properties?.className
  const cls = Array.isArray(cls_val) ? cls_val.join(` `) : undefined
  const attrs = cls ? ` class="${cls}"` : ``
  const inner = children?.map(hast_to_html).join(``) ?? ``
  return `<${tagName}${attrs}>${inner}</${tagName}>`
}

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
