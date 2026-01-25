// Remark plugin - transforms ```svelte example code blocks into rendered components
import { createStarryNight } from '@wooorm/starry-night'
import source_css from '@wooorm/starry-night/source.css'
import source_js from '@wooorm/starry-night/source.js'
import source_json from '@wooorm/starry-night/source.json'
import source_shell from '@wooorm/starry-night/source.shell'
import source_svelte from '@wooorm/starry-night/source.svelte'
import source_ts from '@wooorm/starry-night/source.ts'
import text_html_basic from '@wooorm/starry-night/text.html.basic'
import { toHtml } from 'hast-util-to-html'
import { visit } from 'unist-util-visit'
import path from 'upath'
import { to_base64 } from './utils.ts'

// Initialize starry-night with Svelte and embedded language grammars
const starry_night = await createStarryNight([
  source_svelte,
  source_js,
  source_ts,
  source_css,
  source_json,
  source_shell,
  text_html_basic,
])

// Escape backticks and template literal syntax for embedding in template literals
const encode_escapes = (src: string) =>
  src.replace(/`/g, `\\\``).replace(/\$\{/g, `\\$\{`)

// Regex to find <script> block in svelte
// Note: These patterns handle common cases but may have edge cases with nested
// comments containing </script> strings or complex attribute syntax
const RE_SCRIPT_START =
  /<script(?:\s+?[a-zA-Z]+(=(?:["']){0,1}[a-zA-Z0-9]+(?:["']){0,1}){0,1})*\s*?>/
const RE_SCRIPT_BLOCK = /(<script[\s\S]*?>)([\s\S]*?)(<\/script>)/g
const RE_STYLE_BLOCK = /(<style[\s\S]*?>)([\s\S]*?)(<\/style>)/g

// Parses key=value pairs from a string. Supports strings (with escaped quotes),
// numbers, booleans, and arrays. Note: nested structures in arrays are not supported.
const RE_PARSE_META = /(\w+=\d+|\w+="(?:[^"\\]|\\.)*"|\w+=\[[^\]]*\]|\w+)/g

export const EXAMPLE_MODULE_PREFIX = `___live_example___`
export const EXAMPLE_COMPONENT_PREFIX = `LiveExample___`

// Map code fence language to starry-night grammar scope
const LANG_TO_SCOPE: Record<string, string> = {
  svelte: `source.svelte`,
  html: `text.html.basic`,
  ts: `source.ts`,
  typescript: `source.ts`,
  js: `source.js`,
  javascript: `source.js`,
  css: `source.css`,
  json: `source.json`,
  shell: `source.shell`,
  bash: `source.shell`,
}

// Languages that render as live Svelte components (O(1) lookup)
const LIVE_LANGUAGES = new Set([`svelte`, `html`])

// All languages that support the `example` meta (O(1) lookup)
const EXAMPLE_LANGUAGES = new Set(Object.keys(LANG_TO_SCOPE))

interface RemarkMeta {
  Wrapper?: string | [string, string]
  filename?: string
  csr?: boolean
  example?: boolean
  hideScript?: boolean
  hideStyle?: boolean
  [key: string]: unknown
}

interface RemarkOptions {
  defaults?: Partial<RemarkMeta>
}

interface RemarkTree {
  type: string
  children: RemarkNode[]
}

interface RemarkNode {
  type: string
  lang?: string
  meta?: string
  value?: string
  children?: RemarkNode[]
}

interface RemarkFile {
  filename: string
  cwd: string
}

// Default wrapper component
const DEFAULT_WRAPPER = `$lib/CodeExample.svelte`

type RemarkTransformer = (tree: RemarkTree, file: RemarkFile) => void

function remark(options: RemarkOptions = {}): RemarkTransformer {
  const { defaults = {} } = options

  return function transformer(tree: RemarkTree, file: RemarkFile): void {
    const examples: Array<{ csr?: boolean; wrapper_alias: string }> = []
    // Track wrapper imports to avoid duplicates and generate unique aliases
    const wrapper_aliases = new Map<string, string>() // wrapper key -> alias name

    const filename = path.relative(file.cwd, file.filename)

    // Helper to get or create a wrapper alias
    function get_wrapper_alias(wrapper: string | [string, string]): string {
      // Use '::' as delimiter to avoid misparsing paths with colons (Windows, URLs)
      const wrapper_key = typeof wrapper === `string`
        ? wrapper
        : `${wrapper[0]}::${wrapper[1]}`
      let alias = wrapper_aliases.get(wrapper_key)
      if (!alias) {
        alias = `Example_${wrapper_aliases.size}`
        wrapper_aliases.set(wrapper_key, alias)
      }
      return alias
    }

    visit(tree as RemarkTree, `code`, (node: RemarkNode) => {
      const meta: RemarkMeta = {
        Wrapper: DEFAULT_WRAPPER,
        filename,
        ...defaults,
        ...parse_meta(node.meta || ``),
      }

      const { csr, example, Wrapper } = meta

      // find code blocks with `example` meta in supported languages
      if (example && node.lang && EXAMPLE_LANGUAGES.has(node.lang)) {
        const is_live = LIVE_LANGUAGES.has(node.lang)
        const wrapper_alias = is_live ? get_wrapper_alias(Wrapper ?? DEFAULT_WRAPPER) : ``

        const value = create_example_component(
          node.value || ``,
          meta,
          is_live ? examples.length : -1, // -1 for code-only (no component import needed)
          node.lang,
          is_live,
          wrapper_alias,
        )

        // Only track live examples for component imports
        if (is_live) {
          examples.push({ csr, wrapper_alias })
        }

        node.type = `paragraph`
        node.children = [{ type: `text`, value }]
        delete node.lang
        delete node.meta
        delete node.value
      }
    })

    // add imports for each generated example
    let scripts = ``
    // Add wrapper imports
    // Use '::' as the tuple delimiter to avoid misparsing Windows paths (C:\path)
    // or URLs (https://example.com) that contain single colons
    for (const [wrapper_key, alias] of wrapper_aliases) {
      const double_colon_idx = wrapper_key.indexOf(`::`)
      if (double_colon_idx === -1) {
        // Simple string path (default import)
        scripts += `import ${alias} from "${wrapper_key}";\n`
      } else {
        // Tuple [module, export] using '::' delimiter
        const module_path = wrapper_key.slice(0, double_colon_idx)
        const export_name = wrapper_key.slice(double_colon_idx + 2)
        scripts += `import { ${export_name} as ${alias} } from "${module_path}";\n`
      }
    }
    // Add example component imports
    for (const [idx, ex] of examples.entries()) {
      if (!ex.csr) {
        scripts +=
          `import ${EXAMPLE_COMPONENT_PREFIX}${idx} from "${EXAMPLE_MODULE_PREFIX}${idx}.svelte";\n`
      }
    }

    // Try to inject imports into existing script block
    let injected = false
    visit(tree as RemarkTree, `html`, (node: RemarkNode) => {
      if (!injected && node.value && RE_SCRIPT_START.test(node.value)) {
        node.value = node.value.replace(
          RE_SCRIPT_START,
          (opening_tag) => `${opening_tag}\n${scripts}`,
        )
        injected = true
      }
    })

    // Create script block if none existed
    if (!injected) {
      tree.children.push({ type: `html`, value: `<script>\n${scripts}</script>` })
    }
  }
}

function parse_meta(meta: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const part of meta.match(RE_PARSE_META) ?? []) {
    const eq = part.indexOf(`=`)
    const key = eq === -1 ? part : part.slice(0, eq)
    const value = eq === -1 ? `true` : part.slice(eq + 1)
    try {
      result[key] = JSON.parse(value)
    } catch {
      throw new Error(`Unable to parse meta \`${key}=${value}\``)
    }
  }
  return result
}

function format_code(code: string, meta: RemarkMeta): string {
  let result = code
  if (meta.hideScript) result = result.replace(RE_SCRIPT_BLOCK, ``)
  if (meta.hideStyle) result = result.replace(RE_STYLE_BLOCK, ``)
  return result.trim()
}

function create_example_component(
  value: string,
  meta: RemarkMeta,
  index: number,
  lang: string,
  is_live: boolean,
  wrapper_alias: string,
): string {
  const code = format_code(value, meta)
  const tree = starry_night.highlight(code, LANG_TO_SCOPE[lang])
  // Convert newlines to &#10; to prevent bundlers from stripping whitespace
  const highlighted = toHtml(tree).replace(/\n/g, `&#10;`)

  // Code-only examples (ts, js, css, etc.) - just render highlighted code block
  if (!is_live) {
    // Close and reopen <p> to avoid block-in-inline HTML nesting issues
    return `</p><pre class="highlight highlight-${lang}"><code>{@html ${
      JSON.stringify(highlighted)
    }}</code></pre><p>`
  }

  // Live examples (svelte, html) - render with CodeExample wrapper
  const live_example_component_name = `${EXAMPLE_COMPONENT_PREFIX}${index}`

  const props = {
    // Base64 encoded to prevent preprocessors from modifying the content
    // Gets parsed as virtual file content in vite plugin and then removed
    __live_example_src: `"${to_base64(value)}"`,
    // src is a string prop, meta is an object expression - different escaping needed
    src: JSON.stringify(encode_escapes(code)),
    meta: encode_escapes(JSON.stringify(meta)),
  }

  // Close and reopen <p> to avoid block-in-inline HTML nesting issues
  return `</p>
  <${wrapper_alias}
    __live_example_src={${props.__live_example_src}}
    src={${props.src}}
    meta={${props.meta}}
  >
    {#snippet example()}
      ${
    meta.csr
      ? `
        {#if typeof window !== 'undefined'}
        {#await import("${EXAMPLE_MODULE_PREFIX}${index}.svelte") then module}
          {@const ${live_example_component_name} = module.default}
          <${live_example_component_name} />
        {/await}
        {/if}`
      : `<${live_example_component_name} />`
  }
    {/snippet}

    {#snippet code()}
      {@html ${JSON.stringify(highlighted)}}
    {/snippet}
  </${wrapper_alias}>
  <p>`
}

export default remark
