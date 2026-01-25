// Vite plugin - handles virtual module resolution for example components
// @ts-expect-error no types available
import ast from 'abstract-syntax-tree'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { createUnplugin } from 'unplugin'
import path from 'upath'
import type { ModuleNode, ViteDevServer } from 'vite'
import { EXAMPLE_MODULE_PREFIX } from './mdsvex-transform.ts'

// Decode base64 encoded source
const from_base64 = (src: string) => Buffer.from(src, `base64`).toString(`utf-8`)

// Edit operation: replace text at [start, end) with content
type Edit = { start: number; end: number; content: string }

// Apply edits in reverse order so positions stay valid
const apply_edits = (source: string, edits: Edit[]): string =>
  edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (str, { start, end, content }) => str.slice(0, start) + content + str.slice(end),
      source,
    )

interface PluginOptions {
  extensions?: string[]
}

interface AstNode {
  type: string
  key?: { name: string }
  value?: string
  source?: { value?: string; start?: number; end?: number }
  start?: number
  end?: number
}

export default createUnplugin((options: PluginOptions = {}) => {
  const { extensions = [`.svelte.md`, `.md`, `.svx`] } = options

  // Extracted examples as individual virtual files (id -> svelte source)
  const virtual_files = new Map<string, string>()

  let vite_server: ViteDevServer | undefined

  return {
    name: `live-examples-plugin`,
    transformInclude(id: string) {
      // Strip query params for extension check (Vite adds ?query for HMR, styles, etc.)
      const base_id = id.split(`?`)[0]
      return extensions.some((ext) => base_id.endsWith(ext)) ||
        id.includes(EXAMPLE_MODULE_PREFIX)
    },
    resolveId(id: string) {
      if (id.includes(EXAMPLE_MODULE_PREFIX)) {
        // Force absolute path (dev uses relative, prod uses absolute)
        const cwd = path.toUnix(process.cwd())
        return id.includes(cwd) ? id : path.join(cwd, id)
      }
    },
    load(id: string) {
      if (id.includes(EXAMPLE_MODULE_PREFIX)) {
        // Strip query parameters - Vite requests derived modules (styles, etc.) with queries
        // like ?inline&svelte&type=style&lang.css but we store the base path
        const base_id = id.split(`?`)[0]
        const src = virtual_files.get(base_id)
        if (src) return src
        // Virtual file not found - this can happen during HMR race conditions or if
        // the parent markdown file hasn't been processed yet. In production, this
        // indicates a bug. In dev, it may resolve on next HMR update.
        const msg = `Example src not found for ${id}`
        if (process.env.NODE_ENV === `production`) {
          throw new Error(msg)
        }
        this.warn(msg)
        // Return error component to surface the issue visibly in the browser
        return `<script>console.error(${
          JSON.stringify(msg)
        })</script><p style="color:red">${msg}</p>`
      }
    },

    transform(code: string, id: string) {
      // Skip derived modules (styles, etc.) - only process the main markdown file
      // Vite creates derived modules like ?svelte&type=style&lang.css for style blocks
      if (id.includes(`?svelte&type=`)) return { code, map: { mappings: `` } }

      // Strip query params - Vite adds ?raw, ?inline, etc.
      const base_id = id.split(`?`)[0]
      if (extensions.some((ext) => base_id.endsWith(ext))) {
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

        let idx = 0
        for (const prop of src_props) {
          // Extract the string literal content (base64 encoded)
          const string_literals = ast.find(prop, {
            type: `Literal`,
          }) as AstNode[]

          if (string_literals.length === 0) continue

          const value_node = string_literals[0]
          // AST Literal nodes store value in .value property (string for literals)
          const base64_content = String(value_node.value ?? ``)
          const src = from_base64(base64_content)

          // Use base_id (without query params) to ensure consistent virtual file IDs
          const virtual_id = `${base_id}${EXAMPLE_MODULE_PREFIX}${idx}.svelte`

          if (src !== virtual_files.get(virtual_id)) {
            virtual_files.set(virtual_id, src)

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
            while (end < code.length && /[\s,]/.test(code[end])) end++
            edits.push({ start: prop.start, end, content: `` })
          }

          idx++
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

    vite: {
      configureServer(server: ViteDevServer) {
        vite_server = server
      },

      handleHotUpdate(ctx) {
        const { server, modules: ctx_modules } = ctx
        const modules: ModuleNode[] = []

        // return virtual file modules for parent file
        if (extensions.some((ext) => ctx.file.endsWith(ext))) {
          for (const [id] of virtual_files) {
            const parent = id.split(EXAMPLE_MODULE_PREFIX)[0]
            // Use exact path equality to avoid false positives with overlapping suffixes
            if (ctx.file === parent) {
              const mod = server.moduleGraph.getModuleById(id)
              if (mod) {
                modules.push(mod, ...mod.clientImportedModules, ...mod.ssrImportedModules)
              }
            }
          }
        }

        return [...modules, ...ctx_modules]
      },
    },
  }
})
