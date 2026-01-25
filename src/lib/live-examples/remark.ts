// Remark plugin - transforms ```svelte example code blocks into rendered components
import { fileURLToPath } from 'node:url'
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

const encode_escapes = (src: string) =>
  src.replace(/`/g, `\\\``).replace(/\$\{/g, `\\$\\{`)

const _dirname = typeof __dirname !== `undefined`
  ? __dirname
  : path.dirname(fileURLToPath(import.meta.url))

// regex to find <script> block in svelte
const RE_SCRIPT_START =
  /<script(?:\s+?[a-zA-z]+(=(?:["']){0,1}[a-zA-Z0-9]+(?:["']){0,1}){0,1})*\s*?>/
const RE_SCRIPT_BLOCK = /(<script[\s\S]*?>)([\s\S]*?)(<\/script>)/g
const RE_STYLE_BLOCK = /(<style[\s\S]*?>)([\s\S]*?)(<\/style>)/g

// parses key=value pairs from a string. supports strings, numbers, booleans, and arrays
const RE_PARSE_META = /(\w+=\d+|\w+="[^"]*"|\w+=\[[^\]]*\]|\w+)/g

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

// Languages that render as live Svelte components
const LIVE_LANGUAGES = [`svelte`, `html`]

// All languages that support the `example` meta
const EXAMPLE_LANGUAGES = Object.keys(LANG_TO_SCOPE)

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
  ExampleComponent?: string // deprecated
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

export default function remark(options: RemarkOptions = {}) {
  const { defaults = {} } = options

  // legacy
  if (options.ExampleComponent) {
    defaults.Wrapper = options.ExampleComponent
    console.warn(`ExampleComponent is deprecated, use defaults.Wrapper instead`)
  }

  return function transformer(tree: RemarkTree, file: RemarkFile) {
    const examples: Array<{ csr?: boolean; Wrapper: string | [string, string] }> = []

    const filename = path.toUnix(file.filename).split(path.toUnix(file.cwd)).pop()

    visit(tree as RemarkTree, `code`, (node: RemarkNode) => {
      const meta: RemarkMeta = {
        Wrapper: path.resolve(_dirname, `../CodeExample.svelte`),
        filename,
        ...defaults,
        ...parse_meta(node.meta || ``),
      }

      const { csr, example, Wrapper } = meta

      // find code blocks with `example` meta in supported languages
      if (example && node.lang && EXAMPLE_LANGUAGES.includes(node.lang)) {
        const is_live = LIVE_LANGUAGES.includes(node.lang)
        const value = create_example_component(
          node.value || ``,
          meta,
          is_live ? examples.length : -1, // -1 for code-only (no component import needed)
          node.lang,
          is_live,
        )

        // Only track live examples for component imports
        if (is_live) {
          examples.push({ csr, Wrapper: Wrapper || `` })
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
    examples.forEach((example, idx) => {
      const imp = typeof example.Wrapper === `string`
        ? `import Example from "${example.Wrapper}";\n`
        : `import { ${example.Wrapper[1]} as Example } from "${example.Wrapper[0]}";\n`

      if (!scripts.includes(imp)) {
        scripts += imp
      }

      if (!example.csr) {
        scripts +=
          `import ${EXAMPLE_COMPONENT_PREFIX}${idx} from "${EXAMPLE_MODULE_PREFIX}${idx}.svelte";\n`
      }
    })

    let is_script = false

    // add scripts to script block
    visit(tree as RemarkTree, `html`, (node: RemarkNode) => {
      if (node.value && RE_SCRIPT_START.test(node.value)) {
        is_script = true
        node.value = node.value.replace(RE_SCRIPT_START, (script) => {
          return `${script}\n${scripts}`
        })
      }
    })

    // create script block if needed
    if (!is_script) {
      tree.children.push({
        type: `html`,
        value: `<script>\n${scripts}</script>`,
      })
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
    } catch (err) {
      const error = new Error(
        `Unable to parse meta \`${key}=${value}\` - ${(err as Error).message}`,
      )
      error.stack = (err as Error).stack
      throw error
    }
  }

  return result
}

function format_code(code: string, meta: RemarkMeta): string {
  if (meta.hideScript) {
    code = code.replace(RE_SCRIPT_BLOCK, ``)
  }

  if (meta.hideStyle) {
    code = code.replace(RE_STYLE_BLOCK, ``)
  }

  return code.trim()
}

function create_example_component(
  value: string,
  meta: RemarkMeta,
  index: number,
  lang: string,
  is_live: boolean,
): string {
  const code = format_code(value, meta)
  const scope = LANG_TO_SCOPE[lang] || `source.svelte`
  const tree = starry_night.highlight(code, scope)
  const highlighted = toHtml(tree)

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
    // gets parsed as virtual file content in vite plugin and then removed
    __live_example_src: `String.raw\`${encode_escapes(value)}\``,
    src: JSON.stringify(encode_escapes(code)),
    meta: encode_escapes(JSON.stringify(meta)),
  }

  // Close and reopen <p> to avoid block-in-inline HTML nesting issues
  return `</p>
  <Example
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
  </Example>
  <p>`
}
