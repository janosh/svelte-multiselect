// Vite plugin - handles virtual module resolution for example components
// @ts-expect-error no types available
import ast from 'abstract-syntax-tree'
import { Buffer } from 'node:buffer'
import path from 'node:path'
import process from 'node:process'
import type { HmrContext, Plugin, ViteDevServer } from 'vite'
import { EXAMPLE_MODULE_PREFIX } from './mdsvex-transform.ts'
export { EXAMPLE_MODULE_PREFIX }

// Edit operation: replace text at [start, end) with content
type Edit = { start: number; end: number; content: string }

// Max chars to scan after property end for trailing comma/whitespace cleanup
const TRAILING_CLEANUP_BOUND = 50 // Generous bound - typical trailing content is ", " (2 chars)

// Apply edits in reverse order so positions stay valid
const apply_edits = (source: string, edits: Edit[]): string =>
  edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (str, { start, end, content }) => str.slice(0, start) + content + str.slice(end),
      source,
    )

interface AstNode {
  type: string
  key?: { name: string }
  value?: string
  source?: { value?: string; start?: number; end?: number }
  start?: number
  end?: number
}

export default function live_examples_plugin(
  options: { extensions?: string[] } = {},
): Plugin {
  const { extensions = [`.svelte.md`, `.md`, `.svx`] } = options

  // Extracted examples as individual virtual files (id -> svelte source)
  const virtual_files = new Map<string, string>()
  // Reverse lookup: parent markdown path -> set of virtual file IDs (for O(1) HMR lookups)
  const parent_to_virtual = new Map<string, Set<string>>()

  let vite_server: ViteDevServer | undefined

  return {
    name: `live-examples-plugin`,

    configureServer(server) {
      vite_server = server
    },

    resolveId(id: string) {
      if (id.includes(EXAMPLE_MODULE_PREFIX)) {
        // Force absolute path (dev uses relative, prod uses absolute)
        // Use posix.join to ensure forward slashes on all platforms (Vite normalizes to /)
        const cwd = process.cwd().replace(/\\/g, `/`)
        return id.includes(cwd) ? id : path.posix.join(cwd, id)
      }
    },

    load(id: string) {
      if (id.includes(EXAMPLE_MODULE_PREFIX)) {
        // Strip query parameters - Vite requests derived modules (styles, etc.) with queries
        // like ?inline&svelte&type=style&lang.css but we store the base path
        const [base_id, query = ``] = id.split(`?`)
        const src = virtual_files.get(base_id)
        if (src) return src

        // Virtual file not found - can happen during SSR/parallel builds when derived
        // modules (styles, scripts) are requested before parent markdown is transformed.
        // For derived module requests, return empty content to avoid crashes.
        if (
          query.includes(`type=style`) || query.includes(`type=script`) ||
          query.includes(`type=module`)
        ) {
          return ``
        }

        // For main component requests in production, fail the build
        const msg = `Example src not found for ${id}`
        if (process.env.NODE_ENV === `production`) {
          throw new Error(msg)
        }
        // In dev, warn and return error component to surface issue visibly
        this.warn(msg)
        return `<script>console.error(${
          JSON.stringify(msg)
        })</script><p style="color:red">${msg}</p>`
      }
    },

    transform(code: string, id: string) {
      // Strip query params for extension check (Vite adds ?query for HMR, styles, etc.)
      const base_id = id.split(`?`)[0]

      // Skip non-matching files
      const is_example_module = id.includes(EXAMPLE_MODULE_PREFIX)
      const is_markdown = extensions.some((ext) => base_id.endsWith(ext))
      if (!is_example_module && !is_markdown) return

      // Skip derived modules (styles, etc.) - only process the main markdown file
      // Vite creates derived modules like ?svelte&type=style&lang.css for style blocks
      if (id.includes(`?svelte&type=`)) return { code, map: { mappings: `` } }

      if (is_markdown) {
        // Use AST for precise node location, collect edits to apply at end
        let tree
        try {
          tree = ast.parse(code, { ranges: true })
        } catch {
          // Code may contain Svelte syntax that the JS parser can't handle
          // (e.g., template blocks, special directives). Skip transformation.
          return { code, map: { mappings: `` } }
        }
        const edits: Edit[] = []

        // Find all __live_example_src properties
        const src_props = ast.find(tree, {
          type: `Property`,
          key: { name: `__live_example_src` },
        }) as AstNode[]

        for (const [idx, prop] of src_props.entries()) {
          // Extract the string literal content (base64 encoded)
          const string_literals = ast.find(prop, {
            type: `Literal`,
          }) as AstNode[]

          if (string_literals.length === 0) continue

          const value_node = string_literals[0]
          // AST Literal nodes store value in .value property (string for literals)
          const src = Buffer.from(String(value_node.value ?? ``), `base64`).toString(
            `utf-8`,
          )

          // Use base_id (without query params) to ensure consistent virtual file IDs
          const virtual_id = `${base_id}${EXAMPLE_MODULE_PREFIX}${idx}.svelte`

          if (src !== virtual_files.get(virtual_id)) {
            virtual_files.set(virtual_id, src)

            // Update reverse lookup for HMR (get-or-create pattern)
            const virtual_set = parent_to_virtual.get(base_id) ?? new Set()
            if (!parent_to_virtual.has(base_id)) {
              parent_to_virtual.set(base_id, virtual_set)
            }
            virtual_set.add(virtual_id)

            // Invalidate modules for HMR
            if (vite_server) {
              const mod = vite_server.moduleGraph.getModuleById(virtual_id)
              const parent_mod = vite_server.moduleGraph.getModuleById(base_id)
              if (mod) vite_server.moduleGraph.invalidateModule(mod)
              if (parent_mod) vite_server.moduleGraph.invalidateModule(parent_mod)
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

        // Update import paths (static and dynamic) to use virtual file IDs
        const imports = [
          ...ast.find(tree, { type: `ImportDeclaration` }) as AstNode[],
          ...ast.find(tree, { type: `ImportExpression` }) as AstNode[],
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
      // Collect virtual file modules that need HMR updates
      const additional_modules: typeof ctx.modules = []

      // Normalize to forward slashes (ctx.file uses OS separators, Map keys use Vite's forward slashes)
      const file = ctx.file.replace(/\\/g, `/`)
      // O(1) lookup using reverse map instead of iterating all virtual files
      if (extensions.some((ext) => file.endsWith(ext))) {
        const virtual_ids = parent_to_virtual.get(file)
        if (virtual_ids) {
          for (const id of virtual_ids) {
            const mod = ctx.server.moduleGraph.getModuleById(id)
            if (mod) additional_modules.push(mod)
          }
        }
      }

      return [...additional_modules, ...ctx.modules]
    },
  }
}
