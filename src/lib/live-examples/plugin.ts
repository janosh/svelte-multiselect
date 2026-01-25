// Vite plugin - handles virtual module resolution for example components
import { createUnplugin } from 'unplugin'
import path from 'upath'
import { EXAMPLE_MODULE_PREFIX } from './remark.ts'

const unescape = (src: string) => src.replace(/\\`/g, `\``).replace(/\\\$\\\{/g, `\${`)
// @ts-expect-error no types available
import ast from 'abstract-syntax-tree'
import process from 'node:process'
import type { ModuleNode, ViteDevServer } from 'vite'

interface PluginOptions {
  extensions?: string[]
}

interface VirtualFile {
  src: string
}

interface AstNode {
  type: string
  key?: { name: string }
  value?: { raw: string }
  source?: { value: string }
  [key: string]: unknown
}

export default createUnplugin((options: PluginOptions = {}) => {
  const { extensions = [`.svelte.md`, `.md`, `.svx`] } = options

  // Extracted examples as individual virtual files
  const virtual_files = new Map<string, VirtualFile>()

  let vite_server: ViteDevServer | undefined

  // Iterates over each __live_example_src node in generated svelte file
  function iterate_example_src_nodes(
    tree: unknown,
    cb: (src_node: AstNode, value_node: AstNode, index: number) => void,
  ) {
    const example_src_nodes = ast.find(tree, {
      type: `Property`,
      key: { name: `__live_example_src` },
    }) as AstNode[]

    // Track index separately to ensure contiguous IDs matching remark plugin output
    let callback_idx = 0
    for (const node of example_src_nodes) {
      const [value_node] = ast.find(node, {
        type: `TemplateElement`,
      }) as AstNode[]

      if (!value_node) { // This should never happen since remark always generates String.raw`...`
        // If it does, fail fast to avoid silent ID mismatches
        throw new Error(
          `__live_example_src property found without TemplateElement. Maybe a bug in the remark plugin or AST parsing.`,
        )
      }

      cb(node, value_node, callback_idx)
      callback_idx++
    }
  }

  return {
    name: `live-examples-plugin`,
    transformInclude(id: string) {
      return extensions.some((ext) => id.endsWith(ext)) ||
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
        const file = virtual_files.get(id)
        if (file) return file.src
        this.warn(`Example src not found for ${id}`)
      }
    },

    transform(code: string, id: string) {
      if (extensions.some((ext) => id.endsWith(ext))) {
        const tree = ast.parse(code)

        iterate_example_src_nodes(tree, (src_node, value_node, idx) => {
          const virtual_id = `${id}${EXAMPLE_MODULE_PREFIX}${idx}.svelte`
          const prev = virtual_files.get(virtual_id)?.src
          const next = unescape(value_node.value?.raw || ``)

          if (next !== prev) {
            virtual_files.set(virtual_id, { src: next })

            // invalidate module for hmr
            if (vite_server) {
              const mod = vite_server.moduleGraph.getModuleById(virtual_id)
              const parent_mod = vite_server.moduleGraph.getModuleById(id)
              if (mod) {
                vite_server.moduleGraph.invalidateModule(mod)
                if (parent_mod) {
                  vite_server.moduleGraph.invalidateModule(parent_mod)
                }
              }
            }
          }

          // remove the __live_example_src prop
          ast.remove(tree, src_node)

          // update the import path
          ast.replace(tree, (node: AstNode) => {
            if (
              (node.type === `ImportDeclaration` || node.type === `ImportExpression`) &&
              node.source?.value === `${EXAMPLE_MODULE_PREFIX}${idx}.svelte`
            ) node.source.value = virtual_id
            return node
          })
        })

        return {
          code: ast.generate(tree),
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
