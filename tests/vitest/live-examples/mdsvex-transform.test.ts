// Tests for mdsvex-transform.ts - the remark plugin that transforms code blocks
import remark, {
  EXAMPLE_COMPONENT_PREFIX,
  EXAMPLE_MODULE_PREFIX,
} from '$lib/live-examples/mdsvex-transform'
import { describe, expect, test } from 'vitest'
import { Buffer } from 'node:buffer'

// Minimal types for testing
interface TestNode {
  type: string
  lang?: string
  meta?: string
  value?: string
  children?: TestNode[]
}

interface TestTree {
  type: string
  children: TestNode[]
}

// Helpers
const create_tree = (children: TestNode[] = []): TestTree => ({ type: `root`, children })
const create_code_node = (lang: string, value: string, meta = ``): TestNode => ({
  type: `code`,
  lang,
  value,
  meta,
})
const create_file = (filename = `/project/src/test.md`, cwd = `/project`) => ({
  filename,
  cwd,
})

// Find script node in tree (repeated pattern)
const find_script_node = (tree: TestTree): string | undefined => {
  const node = tree.children.find(
    (n) => n.type === `html` && n.value?.includes(`<script>`),
  )
  return node?.value
}

// Get first example text value
const get_example_value = (tree: TestTree): string => {
  const node = tree.children[0] as { children?: Array<{ value?: string }> }
  return node.children?.[0]?.value ?? ``
}

describe(`exports`, () => {
  test(`exports correct prefix values`, () => {
    expect(EXAMPLE_MODULE_PREFIX).toBe(`___live_example___`)
    expect(EXAMPLE_COMPONENT_PREFIX).toBe(`LiveExample___`)
  })
})

describe(`remark plugin initialization`, () => {
  test(`returns transformer function with empty options`, () => {
    expect(typeof remark({})).toBe(`function`)
  })

  test(`returns transformer function with defaults`, () => {
    expect(typeof remark({ defaults: { hideStyle: true } })).toBe(`function`)
  })

  test(`returns transformer function with no options`, () => {
    expect(typeof remark()).toBe(`function`)
  })
})

describe(`code block detection`, () => {
  test(`ignores code blocks without example meta`, () => {
    const tree = create_tree([create_code_node(`svelte`, `<div>Hello</div>`)])
    remark()(tree, create_file())
    expect(tree.children[0]).toMatchObject({ type: `code`, lang: `svelte` })
  })

  test.each([`svelte`, `html`])(`transforms %s code blocks to live examples`, (lang) => {
    const tree = create_tree([create_code_node(lang, `<div>Hello</div>`, `example`)])
    remark()(tree, create_file())
    expect(tree.children[0]).toMatchObject({ type: `paragraph` })
    expect(get_example_value(tree)).toContain(EXAMPLE_COMPONENT_PREFIX)
  })

  test.each([`ts`, `typescript`, `js`, `javascript`, `css`, `json`, `shell`, `bash`])(
    `transforms %s code blocks as code-only (no live component)`,
    (lang) => {
      const tree = create_tree([create_code_node(lang, `const x = 1`, `example`)])
      remark()(tree, create_file())
      const value = get_example_value(tree)
      expect(value).toContain(`highlight-${lang}`)
      expect(value).not.toContain(EXAMPLE_COMPONENT_PREFIX)
    },
  )

  test(`ignores unsupported languages even with example meta`, () => {
    const tree = create_tree([create_code_node(`python`, `print("hello")`, `example`)])
    remark()(tree, create_file())
    expect(tree.children[0]).toMatchObject({ type: `code`, lang: `python` })
  })
})

describe(`meta parsing`, () => {
  test.each([
    [`example id="my-example"`, `"id":"my-example"`],
    [`example count=42`, `"count":42`],
    [`example tags=[1,2,3]`, `"tags":[1,2,3]`],
    [`example title="say \\"hello\\""`, `say`],
  ])(`parses meta %s containing %s`, (meta, expected) => {
    const tree = create_tree([create_code_node(`svelte`, `<div>Test</div>`, meta)])
    remark()(tree, create_file())
    expect(get_example_value(tree)).toContain(expected)
  })

  test(`throws on invalid meta value`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<div>Test</div>`, `example invalid=[not,valid,json]`),
    ])
    expect(() => remark()(tree, create_file())).toThrow(`Unable to parse meta`)
  })
})

describe(`wrapper component handling`, () => {
  test(`uses default wrapper when not specified`, () => {
    const tree = create_tree([create_code_node(`svelte`, `<div>Test</div>`, `example`)])
    remark()(tree, create_file())
    const script = find_script_node(tree)
    expect(script).toContain(`import Example_0 from`)
    expect(script).toContain(`$lib/CodeExample.svelte`)
  })

  test(`uses custom wrapper from defaults option`, () => {
    const tree = create_tree([create_code_node(`svelte`, `<div>Test</div>`, `example`)])
    remark({ defaults: { Wrapper: `$lib/Custom.svelte` } })(tree, create_file())
    expect(find_script_node(tree)).toContain(`$lib/Custom.svelte`)
  })

  test(`uses per-example wrapper from meta`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<div>Test</div>`, `example Wrapper="$lib/My.svelte"`),
    ])
    remark()(tree, create_file())
    expect(find_script_node(tree)).toContain(`$lib/My.svelte`)
  })

  test(`generates unique aliases and reuses for same wrapper`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<div>1</div>`, `example Wrapper="$lib/A.svelte"`),
      create_code_node(`svelte`, `<div>2</div>`, `example Wrapper="$lib/B.svelte"`),
      create_code_node(`svelte`, `<div>3</div>`, `example Wrapper="$lib/A.svelte"`),
    ])
    remark()(tree, create_file())
    const script = find_script_node(tree) ?? ``
    expect(script).toContain(`Example_0`)
    expect(script).toContain(`Example_1`)
    expect(script).not.toContain(`Example_2`) // reuses Example_0 for $lib/A.svelte
  })
})

describe(`double-colon delimiter for named exports`, () => {
  test.each([
    [`C:/path/to/wrapper.svelte`, `import Example_0 from "C:/path/to/wrapper.svelte"`],
    [
      `https://example.com/wrapper.svelte`,
      `import Example_0 from "https://example.com/wrapper.svelte"`,
    ],
  ])(`handles path with colon %s as default import`, (wrapper, expected) => {
    const tree = create_tree([
      create_code_node(`svelte`, `<div>Test</div>`, `example Wrapper="${wrapper}"`),
    ])
    remark()(tree, create_file())
    expect(find_script_node(tree)).toContain(expected)
  })
})

describe(`CSR mode`, () => {
  test(`generates dynamic import and skips static import`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<div>Test</div>`, `example csr`),
    ])
    remark()(tree, create_file())
    const value = get_example_value(tree)
    expect(value).toContain(`{#await import(`)
    expect(value).toContain(`typeof window !== 'undefined'`)
    expect(find_script_node(tree)).not.toContain(`import ${EXAMPLE_COMPONENT_PREFIX}0`)
  })
})

describe(`hideScript and hideStyle options`, () => {
  test.each([
    [`hideScript`, `<script>let x = 1</script><div>Test</div>`, `let x = 1`, `Test`],
    [
      `hideStyle`,
      `<div>Test</div><style>div { color: red }</style>`,
      `color: red`,
      `Test`,
    ],
  ])(`%s removes block from highlighted code`, (option, code, hidden, visible) => {
    const tree = create_tree([create_code_node(`svelte`, code, `example ${option}`)])
    remark()(tree, create_file())
    const value = get_example_value(tree)
    expect(value).not.toContain(hidden)
    expect(value).toContain(visible)
  })

  test(`applies hideStyle from defaults`, () => {
    const code = `<div>Test</div><style>div { color: red }</style>`
    const tree = create_tree([create_code_node(`svelte`, code, `example`)])
    remark({ defaults: { hideStyle: true } })(tree, create_file())
    expect(get_example_value(tree)).not.toContain(`color: red`)
  })
})

describe(`script block injection`, () => {
  test(`creates new script block when none exists`, () => {
    const tree = create_tree([create_code_node(`svelte`, `<div>Test</div>`, `example`)])
    remark()(tree, create_file())
    expect(find_script_node(tree)).toMatch(/<script>[\s\S]*<\/script>/)
  })

  test(`adds imports to existing script block`, () => {
    const tree = create_tree([
      { type: `html`, value: `<script>const existing = true</script>` },
      create_code_node(`svelte`, `<div>Test</div>`, `example`),
    ])
    remark()(tree, create_file())
    const script = tree.children.find((n) => n.value?.includes(`const existing`))?.value
    expect(script).toContain(`import Example_0`)
    expect(script).toContain(`const existing`)
  })
})

describe(`multiple examples`, () => {
  test(`handles multiple examples with incrementing indices`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<div>First</div>`, `example`),
      create_code_node(`svelte`, `<div>Second</div>`, `example`),
      create_code_node(`svelte`, `<div>Third</div>`, `example`),
    ])
    remark()(tree, create_file())
    const script = find_script_node(tree) ?? ``
    for (const idx of [0, 1, 2]) {
      expect(script).toContain(`${EXAMPLE_COMPONENT_PREFIX}${idx}`)
      expect(script).toContain(`${EXAMPLE_MODULE_PREFIX}${idx}.svelte`)
    }
  })

  test(`mixes live and code-only examples correctly`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<div>Live</div>`, `example`),
      create_code_node(`typescript`, `const x = 1`, `example`),
      create_code_node(`svelte`, `<div>Live2</div>`, `example`),
    ])
    remark()(tree, create_file())
    const script = find_script_node(tree) ?? ``
    // Only 2 live examples (svelte), ts doesn't count
    expect(script).toContain(`${EXAMPLE_COMPONENT_PREFIX}0`)
    expect(script).toContain(`${EXAMPLE_COMPONENT_PREFIX}1`)
    expect(script).not.toContain(`${EXAMPLE_COMPONENT_PREFIX}2`)
  })
})

describe(`output handling`, () => {
  test(`extracts relative filename from file context`, () => {
    const tree = create_tree([create_code_node(`svelte`, `<div>Test</div>`, `example`)])
    remark()(tree, create_file(`/project/src/routes/demo/+page.md`, `/project`))
    expect(get_example_value(tree)).toContain(`src/routes/demo/+page.md`)
  })

  test(`produces highlighted HTML with spans`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<script>let x = 1</script>`, `example`),
    ])
    remark()(tree, create_file())
    expect(get_example_value(tree)).toContain(`<span`)
  })

  test(`escapes newlines as HTML entities`, () => {
    const tree = create_tree([
      create_code_node(`svelte`, `<script>\nlet x = 1\n</script>`, `example`),
    ])
    remark()(tree, create_file())
    expect(get_example_value(tree)).toContain(`&#10;`)
  })

  test(`includes base64 encoded source`, () => {
    const code = `<div>Hello World</div>`
    const tree = create_tree([create_code_node(`svelte`, code, `example`)])
    remark()(tree, create_file())
    expect(get_example_value(tree)).toContain(Buffer.from(code).toString(`base64`))
  })

  test.each([
    [`<div>{$\`template\`}</div>`, `backticks`],
    [`<script>const x = $\{value}</script>`, `template literal syntax`],
  ])(`handles %s without error`, (code) => {
    const tree = create_tree([create_code_node(`svelte`, code, `example`)])
    remark()(tree, create_file())
    expect(tree.children[0]).toMatchObject({ type: `paragraph` })
  })
})
