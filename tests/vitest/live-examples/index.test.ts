// Tests for live-examples/index.ts - exports and sveltePreprocess wrapper
import {
  EXAMPLE_COMPONENT_PREFIX,
  EXAMPLE_MODULE_PREFIX,
  hast_to_html,
  mdsvex_transform,
  starry_night,
  starry_night_highlighter,
  sveltePreprocess,
  vite_plugin,
} from '$lib/live-examples/index'
import { describe, expect, test, vi } from 'vitest'

// Mock svelte-preprocess - return modified content to distinguish from skipped files
const PROCESSED_MARKER = `__PROCESSED__`
vi.mock(`svelte-preprocess`, () => ({
  sveltePreprocess: () => ({
    markup: ({ content }: { content: string }) =>
      Promise.resolve({ code: `${PROCESSED_MARKER}${content}` }),
    script: ({ content }: { content: string }) =>
      Promise.resolve({ code: `${PROCESSED_MARKER}${content}` }),
    style: ({ content }: { content: string }) =>
      Promise.resolve({ code: `${PROCESSED_MARKER}${content}` }),
  }),
}))

describe(`module exports`, () => {
  test(`exports all expected members`, () => {
    expect(typeof mdsvex_transform).toBe(`function`)
    expect(typeof vite_plugin).toBe(`function`)
    expect(typeof sveltePreprocess).toBe(`function`)
    expect(typeof starry_night_highlighter).toBe(`function`)
    expect(typeof hast_to_html).toBe(`function`)
    expect(typeof starry_night.flagToScope).toBe(`function`)
    expect(starry_night.flagToScope(`svelte`)).toBe(`source.svelte`)
    expect(EXAMPLE_MODULE_PREFIX).toBe(`___live_example___`)
    expect(EXAMPLE_COMPONENT_PREFIX).toBe(`LiveExample___`)
  })
})

describe(`sveltePreprocess wrapper`, () => {
  const call_handler = (
    handler: `markup` | `script` | `style`,
    filename?: string,
  ) => {
    const preprocessor = sveltePreprocess()
    const args = { content: `test`, filename, attributes: {}, markup: `` }
    return (preprocessor as Record<string, (a: typeof args) => Promise<{ code: string }>>)
      [handler]?.(args)
  }

  test(`returns preprocessor group with all handlers`, () => {
    const preprocessor = sveltePreprocess()
    expect(typeof preprocessor.markup).toBe(`function`)
    expect(typeof preprocessor.script).toBe(`function`)
    expect(typeof preprocessor.style).toBe(`function`)
  })

  // All handlers behave identically - test one handler per extension, trust the pattern
  test.each([`.md`, `.mdx`, `.svx`])(`skips %s files`, async (ext) => {
    const result = await call_handler(`markup`, `/project/page${ext}`)
    expect(result?.code).toBe(`test`)
  })

  test.each([`markup`, `script`, `style`] as const)(
    `%s processes .svelte files`,
    async (handler) => {
      const result = await call_handler(handler, `/project/Component.svelte`)
      expect(result?.code).toContain(PROCESSED_MARKER)
    },
  )

  test(`handles missing filename gracefully`, async () => {
    const result = await call_handler(`markup`, undefined)
    expect(result?.code).toContain(PROCESSED_MARKER)
  })
})

describe(`is_markdown detection`, () => {
  const check = (filename?: string) =>
    sveltePreprocess().markup?.({ content: `test`, filename })

  // Markdown extensions (skipped)
  test.each([`file.md`, `file.mdx`, `file.svx`, `path/to/file.md`])(
    `skips markdown: %s`,
    async (filename) => {
      const result = await check(filename)
      expect(result?.code).toBe(`test`)
    },
  )

  // Non-markdown (processed)
  test.each([
    `file.MD`, // case sensitive
    `file.svelte`,
    `file.ts`,
    `filemd`, // no dot
    `file.md.bak`, // not at end
    `path.mdx/file.ts`, // in path, not filename
    undefined,
    ``,
  ])(`processes non-markdown: %s`, async (filename) => {
    const result = await check(filename as string | undefined)
    expect(result?.code).toContain(PROCESSED_MARKER)
  })
})

describe(`integration`, () => {
  test(`preserves markdown code fence content and indentation`, async () => {
    const content = `\`\`\`svelte
<script>
  function test() {
    if (true) {
      console.log('indented')
    }
  }
</script>
\`\`\``
    const result = await sveltePreprocess().markup?.({
      content,
      filename: `/project/demo.md`,
    })
    expect(result?.code).toBe(content)
    expect(result?.code).toContain(`    if (true)`)
  })
})

describe(`mdsvex_transform`, () => {
  test.each([undefined, {}, { defaults: { hideStyle: true } }])(
    `returns transformer with %s`,
    (opts) => {
      expect(typeof mdsvex_transform(opts)).toBe(`function`)
    },
  )
})

describe(`vite_plugin`, () => {
  test(`creates plugin with correct name`, () => {
    const plugin = vite_plugin()
    expect(plugin.name).toBe(`live-examples-plugin`)
  })
})
