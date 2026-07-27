// Lazy starry-night factory. Kept separate from highlighter.ts so consumers picking
// their own grammars can import it without evaluating that module's top-level await
// of the 34-grammar common bundle.
import type { Grammar } from '@wooorm/starry-night'
import { type HastNode, escape_html_text, hast_to_html } from './hast.ts'

export type { Grammar } from '@wooorm/starry-night'

// Structural subset of a starry-night instance that this package uses
export type StarryNight = {
  flagToScope: (flag: string) => string | undefined
  highlight: (value: string, scope: string) => HastNode
}

export type Highlighter = {
  // underlying starry-night instance, grammars compiled on first call then cached
  ready: () => Promise<StarryNight>
  // highlighted HTML without a wrapper element
  highlight: (code: string, lang?: string | null) => Promise<string>
  // full `<pre class="highlight highlight-{lang}"><code>…</code></pre>` block
  highlight_block: (code: string, lang?: string | null) => Promise<string>
}

const optional_peer_error = `svelte-widgets/live-examples requires optional peer dependency @wooorm/starry-night`

const create_instance = async (
  grammars: readonly Grammar[] | undefined,
): Promise<StarryNight> => {
  try {
    const { common, createStarryNight } = await import(`@wooorm/starry-night`)
    // the Svelte grammar ships separately, so only fetch it when defaulting
    const resolved = grammars ?? [
      ...common,
      (await import(`@wooorm/starry-night/source.svelte`)).default,
    ]
    return await createStarryNight(resolved)
  } catch (cause) {
    throw new Error(optional_peer_error, { cause })
  }
}

// Escape characters that would be interpreted as Svelte template syntax
const escape_svelte = (html: string): string =>
  html.replaceAll(`{`, `&#123;`).replaceAll(`}`, `&#125;`)

// Falls back to plain escaped code when the language is missing or unsupported
const render_html = (
  instance: StarryNight,
  code: string,
  lang: string | null | undefined,
): string => {
  const scope = lang ? instance.flagToScope(lang) : undefined
  return scope ? hast_to_html(instance.highlight(code, scope)) : escape_html_text(code)
}

export const render_block = (
  instance: StarryNight,
  code: string,
  lang?: string | null,
): string => {
  // flagToScope lowercases the flag itself, so only the CSS class needs a normalized copy
  const lang_key = lang?.toLowerCase()
  const class_name =
    lang_key && instance.flagToScope(lang_key)
      ? `highlight highlight-${lang_key}`
      : `highlight`
  const html = escape_svelte(render_html(instance, code, lang_key))
  return `<pre class="${class_name}"><code>${html}</code></pre>`
}

// Grammars default to the common bundle (34) + Svelte. Nothing is loaded until the first
// call to ready()/highlight()/highlight_block(); the instance is cached after that,
// including a rejection, so a missing peer dependency isn't retried on every call.
export const create_highlighter = (grammars?: readonly Grammar[]): Highlighter => {
  let instance: Promise<StarryNight> | undefined
  const ready = (): Promise<StarryNight> => (instance ??= create_instance(grammars))
  return {
    ready,
    highlight: async (code, lang) => render_html(await ready(), code, lang),
    highlight_block: async (code, lang) => render_block(await ready(), code, lang),
  }
}
