// Tests for vite-plugin.ts - the Vite plugin for virtual module resolution
import { EXAMPLE_MODULE_PREFIX } from '$lib/live-examples/mdsvex-transform'
import vite_plugin from '$lib/live-examples/vite-plugin'
import { Buffer } from 'node:buffer'
import { describe, expect, test, vi } from 'vitest'
import process from 'node:process'

// Plugin interface for testing
interface TestPlugin {
  name: string
  transformInclude?: (id: string) => boolean
  resolveId?: (id: string, importer: unknown, options: unknown) => string | undefined
  load?: (id: string) => string | undefined
  transform?: (code: string, id: string) => { code: string; map: { mappings: string } }
  configureServer?: (server: unknown) => void
  handleHotUpdate?: (
    ctx: { file: string; server: unknown; modules: unknown[] },
  ) => unknown[]
}

// Helpers
const get_plugin = (options = {}): TestPlugin => {
  const result = vite_plugin.vite(options)
  const plugin = Array.isArray(result) ? result[0] : result
  return plugin as unknown as TestPlugin
}

const create_mock_context = () => ({ warn: vi.fn(), error: vi.fn() })
const encode_base64 = (content: string) => Buffer.from(content).toString(`base64`)

describe(`plugin initialization`, () => {
  test(`creates plugin with correct name`, () => {
    const plugin = get_plugin()
    expect(plugin.name).toBe(`live-examples-plugin`)
  })
})

describe(`transformInclude`, () => {
  const plugin = get_plugin()

  test.each([
    [`.md`, `/path/to/file.md`, true],
    [`.svelte.md`, `/path/to/file.svelte.md`, true],
    [`.svx`, `/path/to/file.svx`, true],
    [`example module`, `/path${EXAMPLE_MODULE_PREFIX}0.svelte`, true],
    [`.ts`, `/path/to/file.ts`, false],
    [`.svelte`, `/path/to/file.svelte`, false],
    [`.js`, `/path/to/file.js`, false],
  ])(`%s file returns %s`, (_, id, expected) => {
    expect(plugin.transformInclude?.(id)).toBe(expected)
  })

  test(`strips query params when checking extensions`, () => {
    expect(plugin.transformInclude?.(`/file.md?raw`)).toBe(true)
    expect(plugin.transformInclude?.(`/file.md?svelte&type=style`)).toBe(true)
  })

  test(`uses custom extensions when provided`, () => {
    const custom = get_plugin({ extensions: [`.custom`] })
    expect(custom.transformInclude?.(`/file.custom`)).toBe(true)
    expect(custom.transformInclude?.(`/file.md`)).toBe(false)
  })
})

describe(`resolveId`, () => {
  const plugin = get_plugin()

  test(`resolves example module paths to absolute`, () => {
    const resolved = plugin.resolveId?.(`${EXAMPLE_MODULE_PREFIX}0.svelte`, undefined, {})
    expect(resolved).toContain(EXAMPLE_MODULE_PREFIX)
    expect(resolved).toMatch(/^\//)
  })

  test(`preserves already absolute paths`, () => {
    const id = `${process.cwd()}/src/test.md${EXAMPLE_MODULE_PREFIX}0.svelte`
    expect(plugin.resolveId?.(id, undefined, {})).toBe(id)
  })

  test(`returns undefined for non-example modules`, () => {
    expect(plugin.resolveId?.(`/path/to/file.md`, undefined, {})).toBeUndefined()
  })
})

describe(`load`, () => {
  const plugin = get_plugin()
  const base_id = `/path/to/file.md${EXAMPLE_MODULE_PREFIX}0.svelte`

  test.each([
    [`style`, `?inline&svelte&type=style&lang.css`],
    [`script`, `?svelte&type=script`],
    [`module`, `?type=module`],
  ])(`returns empty string for %s module requests when file not found`, (_, query) => {
    const ctx = create_mock_context()
    expect(plugin.load?.call(ctx, `${base_id}${query}`)).toBe(``)
    expect(ctx.warn).not.toHaveBeenCalled()
  })

  test(`returns error component for main component requests when file not found`, () => {
    const ctx = create_mock_context()
    const result = plugin.load?.call(ctx, base_id)
    expect(result).toContain(`<script>console.error`)
    expect(result).toContain(`Example src not found`)
    expect(ctx.warn).toHaveBeenCalled()
  })

  test(`returns undefined for non-example modules`, () => {
    expect(plugin.load?.call(create_mock_context(), `/path/to/regular.md`))
      .toBeUndefined()
  })
})

describe(`transform`, () => {
  const plugin = get_plugin()
  const ctx = create_mock_context()

  test(`skips derived modules`, () => {
    const code = `some code`
    const result = plugin.transform?.call(ctx, code, `/file.md?svelte&type=style`)
    expect(result).toEqual({ code, map: { mappings: `` } })
  })

  test(`returns original code when AST parsing fails`, () => {
    const code = `{#if condition}<div>test</div>{/if}`
    const result = plugin.transform?.call(ctx, code, `/file.md`)
    expect(result).toEqual({ code, map: { mappings: `` } })
  })

  test(`extracts __live_example_src from code`, () => {
    const code = `const props = { __live_example_src: "${
      encode_base64(`<div>Hello</div>`)
    }", other: "value" }`
    const result = plugin.transform?.call(ctx, code, `/file.md`) as { code: string }
    expect(result.code).not.toContain(`__live_example_src`)
    expect(result.code).toContain(`other`)
  })

  test(`updates import paths to absolute virtual file IDs`, () => {
    const code = `import Component from "${EXAMPLE_MODULE_PREFIX}0.svelte";`
    const id = `/path/to/file.md`
    const result = plugin.transform?.call(ctx, code, id) as { code: string }
    expect(result.code).toContain(`${id}${EXAMPLE_MODULE_PREFIX}0.svelte`)
  })

  test(`handles dynamic imports`, () => {
    const code = `const module = await import("${EXAMPLE_MODULE_PREFIX}0.svelte");`
    const id = `/path/to/file.md`
    const result = plugin.transform?.call(ctx, code, id) as { code: string }
    expect(result.code).toContain(`${id}${EXAMPLE_MODULE_PREFIX}0.svelte`)
  })

  test(`applies multiple edits in correct order`, () => {
    const code = `
      const a = { __live_example_src: "${encode_base64(`<div>First</div>`)}", x: 1 };
      const b = { __live_example_src: "${encode_base64(`<div>Second</div>`)}", y: 2 };
    `
    const result = plugin.transform?.call(ctx, code, `/file.md`) as { code: string }
    expect(result.code).not.toContain(`__live_example_src`)
    expect(result.code).toContain(`x: 1`)
    expect(result.code).toContain(`y: 2`)
  })

  test(`handles multiple static and dynamic imports`, () => {
    const code = `
      import A from "${EXAMPLE_MODULE_PREFIX}0.svelte";
      import B from "${EXAMPLE_MODULE_PREFIX}1.svelte";
      const C = await import("${EXAMPLE_MODULE_PREFIX}2.svelte");
    `
    const id = `/path/to/file.md`
    const result = plugin.transform?.call(ctx, code, id) as { code: string }
    for (const idx of [0, 1, 2]) {
      expect(result.code).toContain(`${id}${EXAMPLE_MODULE_PREFIX}${idx}.svelte`)
    }
  })
})

describe(`edge cases`, () => {
  const plugin = get_plugin()
  const ctx = create_mock_context()

  test.each([
    [``, `empty code`],
    [`const x = 1; const y = 2;`, `code without __live_example_src`],
  ])(`handles %s`, (code, _) => {
    const result = plugin.transform?.call(ctx, code, `/file.md`)
    expect(result).toEqual({ code, map: { mappings: `` } })
  })

  test.each([
    `<script>const x = "hello"</script><div>{x}</div>`,
    `<div>Hello 世界 🌍</div>`,
  ])(`correctly decodes base64 content: %s`, (original) => {
    const code = `const props = { __live_example_src: "${encode_base64(original)}" }`
    expect(plugin.transform?.call(ctx, code, `/file.md`)).toBeDefined()
  })
})

describe(`vite-specific hooks`, () => {
  test(`configureServer accepts server without throwing`, () => {
    const plugin = get_plugin()
    const mock_server = {
      moduleGraph: { getModuleById: vi.fn(), invalidateModule: vi.fn() },
    }
    expect(() => plugin.configureServer?.(mock_server)).not.toThrow()
  })

  test.each([
    [`/path/to/file.md`, true],
    [`/path/to/file.ts`, false],
  ])(`handleHotUpdate for %s returns modules`, (file, is_markdown) => {
    const plugin = get_plugin()
    const ctx = {
      file,
      server: { moduleGraph: { getModuleById: vi.fn().mockReturnValue(null) } },
      modules: [{ id: `existing` }],
    }
    const result = plugin.handleHotUpdate?.(ctx)
    expect(result).toContain(ctx.modules[0])
    if (!is_markdown) expect(result).toEqual(ctx.modules)
  })
})

describe(`virtual file caching`, () => {
  test(`caches and updates virtual files`, () => {
    const plugin = get_plugin()
    const ctx = create_mock_context()
    const id = `/path/to/file.md`

    // First transform
    const code1 = `const props = { __live_example_src: "${
      encode_base64(`<div>First</div>`)
    }" }`
    plugin.transform?.call(ctx, code1, id)

    // Second transform with different content
    const code2 = `const props = { __live_example_src: "${
      encode_base64(`<div>Second</div>`)
    }" }`
    expect(plugin.transform?.call(ctx, code2, id)).toBeDefined()
  })
})
