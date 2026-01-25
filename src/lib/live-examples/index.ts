// Live examples - transforms ```svelte example code blocks into rendered components
// with syntax highlighting and live preview
export { default as mdsvex_transform } from './mdsvex-transform.ts'
export { default as vite_plugin } from './vite-plugin.ts'
export { EXAMPLE_COMPONENT_PREFIX, EXAMPLE_MODULE_PREFIX } from './mdsvex-transform.ts'

// Helper to wrap sveltePreprocess to skip .md files
// This is needed because sveltePreprocess would otherwise transpile code inside
// markdown code fences, losing whitespace formatting
import { sveltePreprocess as _sveltePreprocess } from 'svelte-preprocess'

type PreprocessorGroup = ReturnType<typeof _sveltePreprocess>
type SveltePreprocessOptions = Parameters<typeof _sveltePreprocess>[0]

// Check if file is markdown (should skip preprocessing)
const is_markdown = (filename?: string): boolean => filename?.endsWith(`.md`) ?? false

export function sveltePreprocess(opts?: SveltePreprocessOptions): PreprocessorGroup {
  const base = _sveltePreprocess(opts)
  return {
    markup: async (args) => {
      if (is_markdown(args.filename)) return { code: args.content }
      const result = await base.markup?.(args)
      return result ?? { code: args.content }
    },
    script: async (args) => {
      if (is_markdown(args.filename)) return { code: args.content }
      const result = await base.script?.(args)
      return result ?? { code: args.content }
    },
    style: async (args) => {
      if (is_markdown(args.filename)) return { code: args.content }
      const result = await base.style?.(args)
      return result ?? { code: args.content }
    },
  }
}
