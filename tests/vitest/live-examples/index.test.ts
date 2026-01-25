// Tests for live-examples/index.ts - exports and sveltePreprocess wrapper
import {
  EXAMPLE_COMPONENT_PREFIX,
  EXAMPLE_MODULE_PREFIX,
  mdsvex_transform,
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
    expect(typeof vite_plugin.vite).toBe(`function`)
    expect(typeof sveltePreprocess).toBe(`function`)
    expect(EXAMPLE_MODULE_PREFIX).toBe(`___live_example___`)
    expect(EXAMPLE_COMPONENT_PREFIX).toBe(`LiveExample___`)
  })
})

describe(`sveltePreprocess wrapper`, () => {
  test(`returns preprocessor group with all handlers`, () => {
    const preprocessor = sveltePreprocess()
    expect(typeof preprocessor.markup).toBe(`function`)
    expect(typeof preprocessor.script).toBe(`function`)
    expect(typeof preprocessor.style).toBe(`function`)
  })

  // Test all handlers skip markdown files
  test.each(
    [`markup`, `script`, `style`].flatMap((handler) =>
      [`.md`, `.mdx`, `.svx`].map((ext) => [handler, ext])
    ),
  )(`%s handler skips %s files`, async (handler, ext) => {
    const preprocessor = sveltePreprocess()
    const args = {
      content: `test`,
      filename: `/project/page${ext}`,
      attributes: {},
      markup: ``,
    }
    const result = await (preprocessor as Record<
      string,
      (a: typeof args) => Promise<{ code: string }>
    >)[handler]?.(args)
    expect(result?.code).toBe(`test`)
  })

  // Test all handlers process .svelte files
  test.each([`markup`, `script`, `style`])(
    `%s processes .svelte files`,
    async (handler) => {
      const preprocessor = sveltePreprocess()
      const args = {
        content: `test`,
        filename: `/project/Component.svelte`,
        attributes: {},
        markup: ``,
      }
      const result = await (preprocessor as Record<
        string,
        (a: typeof args) => Promise<{ code: string }>
      >)[handler]?.(args)
      expect(result?.code).toContain(PROCESSED_MARKER)
    },
  )

  test(`handles missing filename gracefully`, async () => {
    const result = await sveltePreprocess().markup?.({
      content: `test`,
      filename: undefined,
    })
    expect(result?.code).toContain(PROCESSED_MARKER)
  })
})

describe(`is_markdown detection`, () => {
  test.each([
    // Markdown files (should be skipped)
    [`file.md`, true],
    [`file.mdx`, true],
    [`file.svx`, true],
    [`path/to/file.md`, true],
    [`path/to/file.mdx`, true],
    [`path/to/file.svx`, true],
    // Non-markdown files (should be processed)
    [`file.MD`, false], // case sensitive
    [`file.svelte`, false],
    [`file.ts`, false],
    [`file.js`, false],
    [`file.css`, false],
    [`filemd`, false], // no dot
    [`file.markdown`, false], // not supported
    [undefined, false],
    [``, false],
    // Edge cases - must match only at end
    [`file.md.bak`, false],
    [`path.mdx/file.ts`, false],
    [`file.svx.old`, false],
  ])(`%s -> is_markdown: %s`, async (filename, is_markdown_file) => {
    const result = await sveltePreprocess().markup?.({
      content: `test`,
      filename: filename as string | undefined,
    })

    if (is_markdown_file) {
      expect(result?.code).toBe(`test`)
      expect(result?.code).not.toContain(PROCESSED_MARKER)
    } else {
      expect(result?.code).toContain(PROCESSED_MARKER)
    }
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
  test(`creates plugin with correct name and custom extensions`, () => {
    const instance = vite_plugin.vite({ extensions: [`.custom.md`] })
    const plugin = Array.isArray(instance) ? instance[0] : instance
    expect(plugin.name).toBe(`live-examples-plugin`)

    const transform_include =
      (plugin as { transformInclude?: (id: string) => boolean }).transformInclude
    expect(transform_include?.(`file.custom.md`)).toBe(true)
    expect(transform_include?.(`file.md`)).toBe(false)
  })
})
