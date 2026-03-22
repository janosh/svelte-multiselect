// Tests for vite-plugin.ts - the Vite plugin for virtual module resolution
import vite_plugin, { EXAMPLE_MODULE_PREFIX } from '$lib/live-examples/vite-plugin'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'

const to_base64 = (src: string): string => Buffer.from(src, `utf-8`).toString(`base64`)
const make_code = (src: string): string =>
  `const props = { __live_example_src: "${to_base64(src)}" }`

interface TestPlugin {
  name: string
  enforce?: string
  resolveId?: (id: string) => string | undefined
  load?: (id: string) => string | undefined
  transform?: (
    code: string,
    id: string,
  ) => { code: string; map: { mappings: string } } | undefined
  configureServer?: (server: unknown) => void
  handleHotUpdate?: (ctx: {
    file: string
    server: unknown
    modules: unknown[]
  }) => unknown[]
}

// Merge resolve (enforce:'pre') and main plugins into one for testing
const get_plugin = (options = {}): TestPlugin => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- plugin returns Plugin[] which we test via TestPlugin
  const plugins = vite_plugin(options) as unknown as TestPlugin[]
  const [resolve, main] = plugins
  return { ...main, resolveId: resolve.resolveId, enforce: resolve.enforce }
}

const transform_code = (
  plugin: TestPlugin,
  ctx: ReturnType<typeof create_mock_context>,
  code: string,
  id: string,
) => plugin.transform?.call(ctx, code, id)?.code ?? ``

const create_mock_context = () => ({ warn: vi.fn(), error: vi.fn() })
const create_mock_server = (hot_send = vi.fn()) => ({
  moduleGraph: {
    getModuleById: vi.fn().mockReturnValue(null),
    invalidateModule: vi.fn(),
  },
  hot: { send: hot_send },
})

describe(`plugin initialization`, () => {
  test(`returns two plugins: resolve (pre) and main`, () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- testing plugin shape
    const [resolve, main] = vite_plugin() as unknown as TestPlugin[]
    expect(resolve.name).toBe(`live-examples-resolve`)
    expect(resolve.enforce).toBe(`pre`)
    expect(main.name).toBe(`live-examples-plugin`)
  })
})

describe(`resolveId`, () => {
  const plugin = get_plugin()

  test.each([
    [`relative`, `${EXAMPLE_MODULE_PREFIX}0.svelte`],
    [`root-relative`, `/src/file.md${EXAMPLE_MODULE_PREFIX}0.svelte`],
  ])(`resolves %s paths to absolute without double slashes`, (_, id) => {
    const cwd = process.cwd().replaceAll(`\\`, `/`)
    const resolved = plugin.resolveId?.(id)
    expect(resolved).toContain(EXAMPLE_MODULE_PREFIX)
    expect(resolved?.startsWith(cwd)).toBe(true)
    expect(resolved).not.toContain(`//`)
  })

  test(`preserves already absolute paths`, () => {
    const id = `${process.cwd()}/src/test.md${EXAMPLE_MODULE_PREFIX}0.svelte`
    expect(plugin.resolveId?.(id)).toBe(id)
  })

  test(`returns undefined for non-example modules`, () => {
    expect(plugin.resolveId?.(`/path/to/file.md`)).toBeUndefined()
  })
})

describe(`load`, () => {
  const plugin = get_plugin()
  const base_id = `/path/to/file.md${EXAMPLE_MODULE_PREFIX}0.svelte`

  test.each([
    [`style`, `?inline&svelte&type=style&lang.css`],
    [`script`, `?svelte&type=script`],
    [`module`, `?type=module`],
  ])(
    `returns undefined for %s derived module requests (defers to vite-plugin-svelte)`,
    (_, query) => {
      const ctx = create_mock_context()
      expect(plugin.load?.call(ctx, `${base_id}${query}`)).toBeUndefined()
      expect(ctx.warn).not.toHaveBeenCalled()
    },
  )

  test(`returns error component for main component requests when file not found`, () => {
    const ctx = create_mock_context()
    const result = plugin.load?.call(ctx, base_id)
    expect(result).toContain(`<script>console.error`)
    expect(result).toContain(`Example src not found`)
    expect(ctx.warn).toHaveBeenCalled()
  })

  test(`returns undefined for non-example modules`, () => {
    expect(
      plugin.load?.call(create_mock_context(), `/path/to/regular.md`),
    ).toBeUndefined()
  })

  test(`returns undefined for CSS query even when virtual file exists`, () => {
    const plugin = get_plugin()
    const ctx = create_mock_context()
    const id = `/path/to/file.md`

    const code = `const props = { __live_example_src: "${to_base64(`<div>Test</div>`)}" }`
    plugin.transform?.call(ctx, code, id)

    const virtual_id = `${id}${EXAMPLE_MODULE_PREFIX}0.svelte`
    expect(
      plugin.load?.call(ctx, `${virtual_id}?inline&svelte&type=style&lang.css`),
    ).toBeUndefined()
  })
})

describe(`transform`, () => {
  const plugin = get_plugin()
  const ctx = create_mock_context()

  test.each([
    [`?svelte&type=style`, `standard`],
    [`?inline&svelte&type=style&lang.css`, `SSR with ?inline prefix`],
  ])(`skips derived modules with query %s (%s)`, (query) => {
    const code = `const props = { __live_example_src: "${to_base64(`<div>Test</div>`)}" }`
    expect(transform_code(plugin, ctx, code, `/file.md${query}`)).toBe(code)
  })

  test(`returns original code when AST parsing fails`, () => {
    const code = `{#if condition}<div>test</div>{/if}`
    const result = plugin.transform?.call(ctx, code, `/file.md`)
    expect(result).toEqual({ code, map: { mappings: `` } })
  })

  test(`extracts __live_example_src from code`, () => {
    const code = `const props = { __live_example_src: "${to_base64(
      `<div>Hello</div>`,
    )}", other: "value" }`
    const result_code = transform_code(plugin, ctx, code, `/file.md`)
    expect(result_code).not.toContain(`__live_example_src`)
    expect(result_code).toContain(`other`)
  })

  test.each([
    [`static import`, `import Component from "${EXAMPLE_MODULE_PREFIX}0.svelte";`],
    [
      `dynamic import`,
      `const module = await import("${EXAMPLE_MODULE_PREFIX}0.svelte");`,
    ],
  ])(`updates %s paths to absolute virtual file IDs`, (_, code) => {
    const id = `/path/to/file.md`
    const result_code = transform_code(plugin, ctx, code, id)
    expect(result_code).toContain(`${id}${EXAMPLE_MODULE_PREFIX}0.svelte`)
  })

  test(`applies multiple edits in correct order`, () => {
    const code = `
      const a = { __live_example_src: "${to_base64(`<div>First</div>`)}", x: 1 };
      const b = { __live_example_src: "${to_base64(`<div>Second</div>`)}", y: 2 };
    `
    const result_code = transform_code(plugin, ctx, code, `/file.md`)
    expect(result_code).not.toContain(`__live_example_src`)
    expect(result_code).toContain(`x: 1`)
    expect(result_code).toContain(`y: 2`)
  })

  test(`handles multiple static and dynamic imports`, () => {
    const code = `
      import A from "${EXAMPLE_MODULE_PREFIX}0.svelte";
      import B from "${EXAMPLE_MODULE_PREFIX}1.svelte";
      const C = await import("${EXAMPLE_MODULE_PREFIX}2.svelte");
    `
    const id = `/path/to/file.md`
    const result_code = transform_code(plugin, ctx, code, id)
    for (const idx of [0, 1, 2]) {
      expect(result_code).toContain(`${id}${EXAMPLE_MODULE_PREFIX}${idx}.svelte`)
    }
  })

  test.each([``, `const x = 1;`])(
    `returns unchanged for code without markers: %s`,
    (code) => {
      expect(plugin.transform?.call(ctx, code, `/file.md`)).toEqual({
        code,
        map: { mappings: `` },
      })
    },
  )

  test(`correctly decodes base64 with unicode`, () => {
    const original = `<div>Hello 世界 🌍</div>`
    const code = `const props = { __live_example_src: "${to_base64(original)}" }`
    const plugin = get_plugin()
    const ctx = create_mock_context()
    const id = `/path/to/file.md`
    plugin.transform?.call(ctx, code, id)
    expect(plugin.load?.call(ctx, `${id}${EXAMPLE_MODULE_PREFIX}0.svelte`)).toBe(original)
  })

  test(`updates cached virtual file on re-transform`, () => {
    const plugin = get_plugin()
    const ctx = create_mock_context()
    const id = `/path/to/file.md`
    const virtual_id = `${id}${EXAMPLE_MODULE_PREFIX}0.svelte`

    plugin.transform?.call(ctx, make_code(`<div>First</div>`), id)
    expect(plugin.load?.call(ctx, virtual_id)).toBe(`<div>First</div>`)

    plugin.transform?.call(ctx, make_code(`<div>Second</div>`), id)
    expect(plugin.load?.call(ctx, virtual_id)).toBe(`<div>Second</div>`)
  })

  // Note: The remark transform always generates sequential indices (0, 1, 2...) for live
  // examples. Non-live examples (TypeScript, etc.) don't generate __live_example_src props
  // or imports, so they don't create gaps. The vite plugin's enumeration index matches
  // the import path index because both are sequential.
  test(`props and imports have matching indices and virtual files are loadable`, () => {
    const plugin = get_plugin()
    const ctx = create_mock_context()
    const id = `/path/to/file.md`

    const content0 = `<div>First</div>`
    const content1 = `<div>Second</div>`
    const code = `
      import A from "${EXAMPLE_MODULE_PREFIX}0.svelte";
      import B from "${EXAMPLE_MODULE_PREFIX}1.svelte";
      const props0 = { __live_example_src: "${to_base64(content0)}" };
      const props1 = { __live_example_src: "${to_base64(content1)}" };
    `
    const result_code = transform_code(plugin, ctx, code, id)

    const virtual_id0 = `${id}${EXAMPLE_MODULE_PREFIX}0.svelte`
    const virtual_id1 = `${id}${EXAMPLE_MODULE_PREFIX}1.svelte`
    expect(result_code).toContain(virtual_id0)
    expect(result_code).toContain(virtual_id1)
    expect(result_code).not.toContain(`__live_example_src`)

    expect(plugin.load?.call(ctx, virtual_id0)).toBe(content0)
    expect(plugin.load?.call(ctx, virtual_id1)).toBe(content1)
  })
})

describe(`vite-specific hooks`, () => {
  test.each([[`/path/to/file.md`], [`/path/to/file.ts`]])(
    `handleHotUpdate for %s returns only ctx.modules`,
    (file) => {
      const plugin = get_plugin()
      const ctx = { file, server: create_mock_server(), modules: [{ id: `existing` }] }
      const result = plugin.handleHotUpdate?.(ctx)
      expect(result).toEqual(ctx.modules)
    },
  )
})

describe(`pending_hmr_file lifecycle`, () => {
  beforeEach(() => vi.useFakeTimers())

  const setup_hmr = () => {
    const plugin = get_plugin()
    const ctx = create_mock_context()
    const id = `/path/to/file.md`
    const hot_send = vi.fn()
    const server = create_mock_server(hot_send)
    plugin.configureServer?.(server)
    return { plugin, ctx, id, hot_send, server }
  }

  test(`stale flag cleared after no-change transform — no spurious reload`, () => {
    const { plugin, ctx, id, hot_send, server } = setup_hmr()

    plugin.transform?.call(ctx, make_code(`<div>V1</div>`), id)
    plugin.handleHotUpdate?.({ file: id, server, modules: [] })

    // re-transform with identical examples — fix clears pending_hmr_file
    plugin.transform?.call(ctx, make_code(`<div>V1</div>`), id)

    // later: examples change WITHOUT a preceding handleHotUpdate.
    // Without the fix, stale pending_hmr_file causes spurious full-reload.
    plugin.transform?.call(ctx, make_code(`<div>V2</div>`), id)
    vi.advanceTimersByTime(500)

    expect(hot_send).not.toHaveBeenCalled()
  })

  test(`triggers full-reload when examples actually change during HMR`, () => {
    const { plugin, ctx, id, hot_send, server } = setup_hmr()

    plugin.transform?.call(ctx, make_code(`<div>V1</div>`), id)
    plugin.handleHotUpdate?.({ file: id, server, modules: [] })
    plugin.transform?.call(ctx, make_code(`<div>V2</div>`), id)
    vi.advanceTimersByTime(500)

    expect(hot_send).toHaveBeenCalledWith({ type: `full-reload`, path: `*` })
  })
})
