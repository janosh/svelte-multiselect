// Starry-night highlighter for mdsvex
import { common, createStarryNight } from '@wooorm/starry-night'
import source_svelte from '@wooorm/starry-night/source.svelte'

// HAST node types from starry-night
interface HastText {
  type: `text`
  value: string
}
interface HastElement {
  type: `element`
  tagName: string
  properties?: { className?: string[] }
  children?: HastNode[]
}
interface HastRoot {
  type: `root`
  children: HastNode[]
}
type HastNode = HastText | HastElement | HastRoot
export type { HastRoot }

// Escape HTML special characters in text content (not for attribute values)
const escape_html_text = (str: string): string =>
  str.replace(/&/g, `&amp;`).replace(/</g, `&lt;`).replace(/>/g, `&gt;`)

// Convert HAST to HTML string (simplified - only handles what starry-night outputs)
export const hast_to_html = (node: HastNode): string => {
  if (node.type === `text`) return escape_html_text(node.value)
  if (node.type === `root`) return node.children.map(hast_to_html).join(``)
  const { tagName, properties, children } = node
  const cls = properties?.className?.join(` `)
  const attrs = cls ? ` class="${cls}"` : ``
  const inner = children?.map(hast_to_html).join(``) ?? ``
  return `<${tagName}${attrs}>${inner}</${tagName}>`
}

// Escape characters that would be interpreted as Svelte template syntax
const escape_svelte = (html: string): string =>
  html.replace(/\{/g, `&#123;`).replace(/\}/g, `&#125;`)

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
  const tree = starry_night.highlight(code, scope) as HastRoot
  const html = escape_svelte(hast_to_html(tree))
  return `<pre class="highlight highlight-${lang_key}"><code>${html}</code></pre>`
}
