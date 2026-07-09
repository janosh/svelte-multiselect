// Vite plugin - handles virtual module resolution for example components
import { parse } from 'acorn'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import type { HmrContext, Plugin, ViteDevServer } from 'vite'
import { EXAMPLE_MODULE_PREFIX } from './mdsvex-transform.ts'

// Matches import paths emitted by mdsvex-transform, e.g. ___live_example___0.svelte
const RE_EXAMPLE_IMPORT = new RegExp(`${EXAMPLE_MODULE_PREFIX}(\\d+)\\.svelte`, `u`)

// Edit operation: replace text at [start, end) with content
type Edit = { start: number; end: number; content: string }
type TransformResult = {
  code: string
  map: { mappings: string }
}
const with_empty_map = (code: string): TransformResult => ({
  code,
  map: { mappings: `` },
})

// Max chars to scan after property end for trailing comma/whitespace cleanup
const TRAILING_CLEANUP_BOUND = 50 // Generous bound - typical trailing content is ", " (2 chars)

// Apply edits in reverse order so positions stay valid
const apply_edits = (source: string, edits: Edit[]): string =>
  edits
    .toSorted((a, b) => b.start - a.start)
    .reduce(
      (str, { start, end, content }) => str.slice(0, start) + content + str.slice(end),
      source,
    )

function is_record(val: unknown): val is Record<string, unknown> {
  return typeof val === `object` && val !== null
}

type AstNode = Record<string, unknown>

// Single-pass AST walk collecting the two node kinds this plugin rewrites:
// __live_example_src properties and import declarations/expressions
function collect_nodes(tree: unknown): { src_props: AstNode[]; imports: AstNode[] } {
  const src_props: AstNode[] = []
  const imports: AstNode[] = []
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!is_record(node)) return
    if (
      node.type === `Property` &&
      is_record(node.key) &&
      node.key.name === `__live_example_src`
    ) {
      src_props.push(node)
    } else if (node.type === `ImportDeclaration` || node.type === `ImportExpression`) {
      imports.push(node)
    }
    Object.values(node).forEach(walk)
  }
  walk(tree)
  return { src_props, imports }
}

// Normalize a module ID to absolute path for consistent lookups.
// Can't use path.posix.join because it treats /src/... as already absolute.
function to_absolute(id: string, cwd: string): string {
  if (id.startsWith(`${cwd}/`) || id === cwd) return id
  return id.startsWith(`/`) ? `${cwd}${id}` : `${cwd}/${id}`
}

export default function live_examples_plugin(
  options: { extensions?: string[] } = {},
): Plugin[] {
  const { extensions = [`.svelte.md`, `.md`, `.svx`] } = options

  // Extracted examples as individual virtual files (id -> svelte source)
  const virtual_files = new Map<string, string>()

  let vite_server: ViteDevServer | undefined
  let pending_hmr_file: string | null = null
  const cwd = process.cwd().replaceAll(`\\`, `/`)

  // Pre-enforce plugin ensures resolveId runs before vite-plugin-svelte's
  // load-compiled-css:resolveId, so CSS derived modules get the same absolute
  // path as the main component (needed for module graph CSS cache lookup).
  const resolve_plugin: Plugin = {
    name: `live-examples-resolve`,
    enforce: `pre`,
    resolveId(id: string): string | undefined {
      return id.includes(EXAMPLE_MODULE_PREFIX) ? to_absolute(id, cwd) : undefined
    },
  }

  const main_plugin: Plugin = {
    name: `live-examples-plugin`,

    configureServer(server) {
      vite_server = server
    },

    load(id: string): string | undefined {
      if (!id.includes(EXAMPLE_MODULE_PREFIX)) return undefined

      const [base_id, query = ``] = id.split(`?`)

      // Skip derived module requests (CSS, scripts) - let vite-plugin-svelte handle them.
      // Must check BEFORE virtual_files lookup to avoid returning Svelte source for CSS.
      if (/type=(?<type>style|script|module)/u.test(query)) return undefined

      const src = virtual_files.get(base_id)
      if (src !== undefined) return src

      // For main component requests in production, fail the build
      const msg = `Example src not found for ${id}`
      if (process.env.NODE_ENV === `production`) {
        throw new Error(msg)
      }
      // In dev, warn and return error component to surface issue visibly
      this.warn(msg)
      return `<script>console.error(${JSON.stringify(
        msg,
      )})</script><p style="color:red">${msg}</p>`
    },

    transform(code: string, id: string): TransformResult | undefined {
      // Strip query params for extension check (Vite adds ?query for HMR, styles, etc.)
      const base_id = id.split(`?`)[0]

      // Skip non-matching files
      const is_example_module = id.includes(EXAMPLE_MODULE_PREFIX)
      const is_markdown = extensions.some((ext) => base_id.endsWith(ext))
      if (!is_example_module && !is_markdown) return undefined

      // Skip derived modules (styles, etc.) - only process the main markdown file.
      // Match both ?svelte&type= and ?inline&svelte&type= (SSR adds ?inline prefix)
      if (id.includes(`svelte&type=`)) return with_empty_map(code)

      if (is_markdown) {
        // Use AST for precise node location, collect edits to apply at end
        let tree
        try {
          tree = parse(code, {
            ranges: true,
            ecmaVersion: `latest`,
            sourceType: `module`,
          })
        } catch {
          // Code may contain Svelte syntax that the JS parser can't handle
          // (e.g., template blocks, special directives). Skip transformation.
          return with_empty_map(code)
        }
        const edits: Edit[] = []
        const { src_props, imports } = collect_nodes(tree)
        const invalidate_virtual_modules = (virtual_id: string) => {
          const server = vite_server
          if (!server) return
          for (const module_id of [
            virtual_id,
            base_id,
            `${virtual_id}?svelte&type=style&lang.css`,
          ]) {
            const mod = server.moduleGraph.getModuleById(module_id)
            if (mod) server.moduleGraph.invalidateModule(mod)
          }

          // Trigger full-reload only during HMR (not initial page load).
          // reloadModule alone doesn't work because vite-plugin-svelte's hot-update
          // handler skips CSS-only changes when the JS output is identical.
          if (pending_hmr_file !== base_id) return
          pending_hmr_file = null
          setTimeout(() => {
            server.hot.send({ type: `full-reload`, path: `*` })
          }, 200)
        }

        for (const [idx, prop] of src_props.entries()) {
          // Read the property value directly instead of recursively searching nested literals.
          const prop_value = prop.value
          if (!is_record(prop_value)) continue
          if (prop_value.type !== `Literal` || typeof prop_value.value !== `string`)
            continue

          const src = Buffer.from(prop_value.value, `base64`).toString(`utf-8`)

          // Use base_id (without query params) to ensure consistent virtual file IDs
          const virtual_id = `${base_id}${EXAMPLE_MODULE_PREFIX}${idx}.svelte`

          if (src !== virtual_files.get(virtual_id)) {
            virtual_files.set(virtual_id, src)
            // Invalidate virtual modules and schedule a deferred reload so
            // load() returns fresh content from virtual_files (which was just updated).
            invalidate_virtual_modules(virtual_id)
          }

          // Remove the property (including trailing comma/whitespace)
          if (typeof prop.start === `number` && typeof prop.end === `number`) {
            let end = prop.end
            const max_end = Math.min(prop.end + TRAILING_CLEANUP_BOUND, code.length)
            while (end < max_end && /[\s,]/u.test(code[end])) end++
            edits.push({ start: prop.start, end, content: `` })
          }
        }

        // Clear pending state even if no examples changed — stale flag would
        // cause an unnecessary full-reload on a future edit
        if (pending_hmr_file === base_id) pending_hmr_file = null

        // Update import paths (static and dynamic) to use virtual file IDs
        for (const import_node of imports) {
          const source = import_node.source
          if (!is_record(source) || typeof source.value !== `string`) continue
          const match = RE_EXAMPLE_IMPORT.exec(source.value)
          if (
            match &&
            typeof source.start === `number` &&
            typeof source.end === `number`
          ) {
            const virtual_id = `${base_id}${EXAMPLE_MODULE_PREFIX}${match[1]}.svelte`
            edits.push({
              start: source.start + 1,
              end: source.end - 1,
              content: virtual_id,
            })
          }
        }

        return with_empty_map(apply_edits(code, edits))
      }

      return with_empty_map(code)
    },

    handleHotUpdate(ctx: HmrContext) {
      const file = ctx.file.replaceAll(`\\`, `/`)
      if (extensions.some((ext) => file.endsWith(ext))) {
        pending_hmr_file = file
      }
      // Don't add virtual modules here — they'd be loaded with stale content
      // since the parent .md hasn't been re-transformed yet. The transform
      // hook handles invalidation + reload after virtual_files is updated.
      return ctx.modules
    },
  }

  return [resolve_plugin, main_plugin]
}
