// Remark plugin - transforms ```svelte example code blocks into rendered components
import { fileURLToPath } from 'node:url'
import { createStarryNight } from '@wooorm/starry-night'
import source_css from '@wooorm/starry-night/source.css'
import source_js from '@wooorm/starry-night/source.js'
import source_svelte from '@wooorm/starry-night/source.svelte'
import source_ts from '@wooorm/starry-night/source.ts'
import { toHtml } from 'hast-util-to-html'
import { visit } from 'unist-util-visit'
import path from 'upath'

// Initialize starry-night with Svelte and embedded language grammars
const starry_night = await createStarryNight([
  source_svelte,
  source_js,
  source_ts,
  source_css,
])

const escape = (src: string) => src.replace(/`/g, `\\\``).replace(/\$\{/g, `\\$\\{`)

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

const EXAMPLE_LANGUAGES = [`svelte`, `html`]

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

      // find svelte code blocks with meta to trigger example
      if (example && node.lang && EXAMPLE_LANGUAGES.includes(node.lang)) {
        const value = create_example_component(node.value || ``, meta, examples.length)
        examples.push({ csr, Wrapper: Wrapper || `` })

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
  const meta_parts = meta.match(RE_PARSE_META) ?? []

  for (let idx = 0; idx < meta_parts.length; idx++) {
    const [key, value = `true`] = meta_parts[idx].split(`=`)

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
): string {
  const live_example_component_name = `${EXAMPLE_COMPONENT_PREFIX}${index}`

  const code = format_code(value, meta)
  const tree = starry_night.highlight(code, `source.svelte`)
  const highlighted = toHtml(tree)

  const props = {
    // gets parsed as virtual file content in vite plugin and then removed
    __live_example_src: `String.raw\`${escape(value)}\``,
    src: JSON.stringify(escape(code)),
    meta: escape(JSON.stringify(meta)),
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
