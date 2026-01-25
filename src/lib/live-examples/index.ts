// Live examples - transforms ```svelte example code blocks into rendered components
// with syntax highlighting and live preview
export { starry_night_highlighter } from './highlighter.ts'
export {
  default as mdsvex_transform,
  EXAMPLE_COMPONENT_PREFIX,
  EXAMPLE_MODULE_PREFIX,
} from './mdsvex-transform.ts'
export { default as vite_plugin } from './vite-plugin.ts'

import { mdsvex as _mdsvex, type MdsvexOptions } from 'mdsvex'
import { sveltePreprocess as _sveltePreprocess } from 'svelte-preprocess'
import { starry_night_highlighter } from './highlighter.ts'

type SveltePreprocessOptions = Parameters<typeof _sveltePreprocess>[0]
type PreprocessorGroup = ReturnType<typeof _sveltePreprocess>

// Wrap mdsvex with starry-night highlighter as default (users can override via options.highlight.highlighter)
export function mdsvex(options?: MdsvexOptions): PreprocessorGroup {
  return _mdsvex({
    ...options,
    highlight: { highlighter: starry_night_highlighter, ...options?.highlight },
  }) as PreprocessorGroup
}

// Wrap sveltePreprocess to skip markdown files - otherwise it transpiles code inside
// markdown code fences, losing whitespace formatting
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
