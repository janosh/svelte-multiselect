// Vite plugin - handles virtual module resolution for example components
import { parse } from 'acorn'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import type { HmrContext, Plugin, ViteDevServer } from 'vite-plus'
import { EXAMPLE_MODULE_PREFIX } from './mdsvex-transform.ts'
export { EXAMPLE_MODULE_PREFIX }

// Edit operation: replace text at [start, end) with content
type Edit = { start: number; end: number; content: string }

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

interface AstNode {
  type: string
  key?: { name: string }
  value?: unknown
  source?: { value?: string; start?: number; end?: number }
  start?: number
  end?: number
}

// Check if an AST node matches a shallow pattern object
function matches(node: unknown, pattern: Record<string, unknown>): boolean {
  if (!node || typeof node !== `object`) return false
  for (const [key, expected] of Object.entries(pattern)) {
    const actual = (node as Record<string, unknown>)[key]
    if (expected && typeof expected === `object`) {
      if (!matches(actual, expected as Record<string, unknown>)) return false
    } else if (actual !== expected) return false
  }
  return true
}

// Recursively find all AST nodes matching a pattern
function find_nodes(
  node: unknown,
  pattern: Record<string, unknown>,
  results: AstNode[] = [],
): AstNode[] {
  if (!node || typeof node !== `object`) return results
  if (matches(node, pattern)) results.push(node as AstNode)
  for (const val of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      for (const item of val) find_nodes(item, pattern, results)
    } else if (val && typeof val === `object`) {
      find_nodes(val, pattern, results)
    }
  }
  return results
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
    resolveId(id: string) {
      if (id.includes(EXAMPLE_MODULE_PREFIX)) {
        return to_absolute(id, cwd)
      }
    },
  }

  const main_plugin: Plugin = {
    name: `live-examples-plugin`,

    configureServer(server) {
      vite_server = server
    },

    load(id: string) {
      if (id.includes(EXAMPLE_MODULE_PREFIX)) {
        const [base_id, query = ``] = id.split(`?`)

        // Skip derived module requests (CSS, scripts) - let vite-plugin-svelte handle them.
        // Must check BEFORE virtual_files lookup to avoid returning Svelte source for CSS.
        if (/type=(style|script|module)/.test(query)) return

        const src = virtual_files.get(base_id)
        if (src) return src

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
      }
    },

    transform(code: string, id: string) {
      // Strip query params for extension check (Vite adds ?query for HMR, styles, etc.)
      const base_id = id.split(`?`)[0]

      // Skip non-matching files
      const is_example_module = id.includes(EXAMPLE_MODULE_PREFIX)
      const is_markdown = extensions.some((ext) => base_id.endsWith(ext))
      if (!is_example_module && !is_markdown) return

      // Skip derived modules (styles, etc.) - only process the main markdown file.
      // Match both ?svelte&type= and ?inline&svelte&type= (SSR adds ?inline prefix)
      if (id.includes(`svelte&type=`)) return { code, map: { mappings: `` } }

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
          return { code, map: { mappings: `` } }
        }
        const edits: Edit[] = []

        // Find all __live_example_src properties
        const src_props = find_nodes(tree, {
          type: `Property`,
          key: { name: `__live_example_src` },
        })

        for (const [idx, prop] of src_props.entries()) {
          // Read the property value directly instead of recursively searching nested literals.
          const prop_value = prop.value
          if (!prop_value || typeof prop_value !== `object`) continue

          const literal_type = (prop_value as AstNode).type
          const literal_value = (prop_value as AstNode).value
          if (literal_type !== `Literal` || typeof literal_value !== `string`) continue

          const src = Buffer.from(literal_value, `base64`).toString(`utf-8`)

          // Use base_id (without query params) to ensure consistent virtual file IDs
          const virtual_id = `${base_id}${EXAMPLE_MODULE_PREFIX}${idx}.svelte`

          if (src !== virtual_files.get(virtual_id)) {
            virtual_files.set(virtual_id, src)

            // Invalidate virtual modules and schedule a deferred reload so
            // load() returns fresh content from virtual_files (which was just updated).
            if (vite_server) {
              const mod = vite_server.moduleGraph.getModuleById(virtual_id)
              const parent_mod = vite_server.moduleGraph.getModuleById(base_id)
              if (mod) vite_server.moduleGraph.invalidateModule(mod)
              if (parent_mod) vite_server.moduleGraph.invalidateModule(parent_mod)

              // Also invalidate CSS derived modules so stale CSS cache is cleared
              const css_id = `${virtual_id}?svelte&type=style&lang.css`
              const css_mod = vite_server.moduleGraph.getModuleById(css_id)
              if (css_mod) vite_server.moduleGraph.invalidateModule(css_mod)

              // Trigger full-reload only during HMR (not initial page load).
              // reloadModule alone doesn't work because vite-plugin-svelte's hot-update
              // handler skips CSS-only changes when the JS output is identical.
              if (pending_hmr_file === base_id) {
                pending_hmr_file = null
                setTimeout(() => {
                  vite_server?.hot.send({ type: `full-reload`, path: `*` })
                }, 200)
              }
            }
          }

          // Remove the property (including trailing comma/whitespace)
          if (prop.start !== undefined && prop.end !== undefined) {
            let end = prop.end
            const max_end = Math.min(prop.end + TRAILING_CLEANUP_BOUND, code.length)
            while (end < max_end && /[\s,]/.test(code[end])) end++
            edits.push({ start: prop.start, end, content: `` })
          }
        }

        // Clear pending state even if no examples changed — stale flag would
        // cause an unnecessary full-reload on a future edit
        if (pending_hmr_file === base_id) pending_hmr_file = null

        // Update import paths (static and dynamic) to use virtual file IDs
        const imports = [
          ...find_nodes(tree, { type: `ImportDeclaration` }),
          ...find_nodes(tree, { type: `ImportExpression` }),
        ]
        for (const { source } of imports) {
          const match = source?.value?.match(/___live_example___(\d+)\.svelte/)
          if (match && source?.start !== undefined && source?.end !== undefined) {
            const virtual_id = `${base_id}${EXAMPLE_MODULE_PREFIX}${match[1]}.svelte`
            edits.push({
              start: source.start + 1,
              end: source.end - 1,
              content: virtual_id,
            })
          }
        }

        return {
          code: apply_edits(code, edits),
          map: { mappings: `` },
        }
      }

      return { code, map: { mappings: `` } }
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
