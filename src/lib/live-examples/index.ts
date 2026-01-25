// Live examples - transforms ```svelte example code blocks into rendered components
// with syntax highlighting and live preview
export { default as mdsvex_transform } from './mdsvex-transform.ts'
export { default as vite_plugin } from './vite-plugin.ts'
export { EXAMPLE_COMPONENT_PREFIX, EXAMPLE_MODULE_PREFIX } from './mdsvex-transform.ts'

// Wrap sveltePreprocess to skip markdown files - otherwise it transpiles code inside
// markdown code fences, losing whitespace formatting
import { sveltePreprocess as _sveltePreprocess } from 'svelte-preprocess'

type SveltePreprocessOptions = Parameters<typeof _sveltePreprocess>[0]
type PreprocessorGroup = ReturnType<typeof _sveltePreprocess>

const is_markdown = (filename?: string): boolean => /\.(md|mdx|svx)$/.test(filename ?? ``)

export function sveltePreprocess(opts?: SveltePreprocessOptions): PreprocessorGroup {
  const base = _sveltePreprocess(opts)
  return {
    markup: async (args) =>
      is_markdown(args.filename)
        ? { code: args.content }
        : (await base.markup?.(args)) ?? { code: args.content },
    script: async (args) =>
      is_markdown(args.filename)
        ? { code: args.content }
        : (await base.script?.(args)) ?? { code: args.content },
    style: async (args) =>
      is_markdown(args.filename)
        ? { code: args.content }
        : (await base.style?.(args)) ?? { code: args.content },
  }
}
