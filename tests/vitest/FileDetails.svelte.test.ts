import { FileDetails } from '$lib'
import { flushSync, mount, tick } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

test.each([
  // inferred from title extension
  { file: { title: `comp.svelte`, content: `<p>hi</p>` }, expected_lang: `svelte` },
  { file: { title: `util.ts`, content: `const x = 1` }, expected_lang: `typescript` },
  { file: { title: `app.js`, content: `let x` }, expected_lang: `javascript` },
  { file: { title: `styles.css`, content: `.a{}` }, expected_lang: `css` },
  { file: { title: `script.py`, content: `x = 1` }, expected_lang: `python` },
  { file: { title: `config.yml`, content: `key: val` }, expected_lang: `yaml` },
  // HTML-wrapped title — extension extracted after stripping tags
  {
    file: { title: `<code>options.ts</code>`, content: `export const x = 1` },
    expected_lang: `typescript`,
  },
  // explicit language overrides title inference
  {
    file: { title: `data.json`, content: `{}`, language: `javascript` },
    expected_lang: `javascript`,
  },
  // unknown extension uses extension directly as language flag
  { file: { title: `readme.xyz`, content: `hello` }, expected_lang: `xyz` },
  // no extension falls back to default_lang
  { file: { title: `Makefile`, content: `all:` }, expected_lang: `svelte` },
])(
  `pre gets language-$expected_lang class and lang-label for "$file.title"`,
  ({ file, expected_lang }) => {
    mount(FileDetails, { target: document.body, props: { files: [file] } })
    expect(doc_query(`pre`).className).toContain(`language-${expected_lang}`)
    // the label must surface the resolved language, not the raw extension
    expect(doc_query(`.lang-label`).textContent).toBe(expected_lang)
  },
)

test(`lang-label is positioned out of flow so it can't indent code`, () => {
  mount(FileDetails, {
    target: document.body,
    props: { files: [{ title: `util.ts`, content: `const x = 1` }] },
  })

  const label = doc_query<HTMLSpanElement>(`.lang-label`)
  // pre is white-space: pre, so an in-flow label shifts the first code line right.
  // absolute positioning takes it out of flow (regression guard, see FileDetails.svelte)
  expect(getComputedStyle(label).position).toBe(`absolute`)
})

test(`content with HTML characters is escaped before highlighting loads`, () => {
  const html_content = `<div class="foo">&amp; bar</div>`
  mount(FileDetails, {
    target: document.body,
    props: { files: [{ title: `test.svelte`, content: html_content }] },
  })
  const code_el = doc_query(`pre code`)
  expect(code_el.textContent).toBe(html_content)
  expect(code_el.innerHTML).not.toContain(`<div class="foo">`)
})

test(`unsupported language falls back to escaped raw content`, async () => {
  const content = `some <weird> content`
  mount(FileDetails, {
    target: document.body,
    props: { files: [{ title: `file.xyz`, content, language: `nonexistent-lang-xyz` }] },
  })
  // wait for highlight attempt to complete and fall back
  await vi.waitFor(
    () => {
      const code_el = doc_query(`pre code`)
      if (code_el.innerHTML.includes(`&lt;`)) return
      throw new Error(`not escaped yet`)
    },
    { timeout: 5000 },
  )
  const code_el = doc_query(`pre code`)
  expect(code_el.textContent).toBe(content)
})

test(`syntax highlighting produces starry-night spans`, async () => {
  const svelte_code = `<script lang="ts">\n  let count = $state(0)\n</script>`
  mount(FileDetails, {
    target: document.body,
    props: { files: [{ title: `App.svelte`, content: svelte_code }] },
  })

  await vi.waitFor(
    () => {
      if (!doc_query(`pre code`).querySelector(`span[class^="pl-"]`)) {
        throw new Error(`no highlighted spans yet`)
      }
    },
    { timeout: 5000 },
  )
  expect(doc_query(`pre code`).textContent).toContain(`let count`)
})

test(`toggle all button opens, closes, and handles partial open state`, async () => {
  const files = [
    { title: `file1`, content: `content1` },
    { title: `file2`, content: `content2` },
    { title: `file3`, content: `content3` },
  ]
  mount(FileDetails, {
    target: document.body,
    props: { files, toggle_all_btn_title: `toggle all` },
  })
  await tick()

  const details = Array.from(document.querySelectorAll(`details`))
  const btn = doc_query(`button[title='toggle all']`)
  const all_open = () => details.every((d) => d.open)
  const all_closed = () => details.every((d) => !d.open)

  expect(all_closed()).toBe(true) // initially closed
  btn.click()
  expect(all_open()).toBe(true) // opened all
  btn.click()
  expect(all_closed()).toBe(true) // closed all

  // partial open state: clicking closes all
  details[0].open = true
  details[1].open = true
  btn.click()
  expect(all_closed()).toBe(true)
})

test(`toggle all button label tracks open state from clicks and native toggles`, async () => {
  const files = [
    { title: `file1`, content: `content1` },
    { title: `file2`, content: `content2` },
  ]
  mount(FileDetails, { target: document.body, props: { files } })
  await tick()

  const btn = doc_query(`button[title='Toggle all']`)
  expect(btn.textContent).toContain(`Open all`)

  btn.click()
  flushSync()
  expect(btn.textContent).toContain(`Close all`)

  btn.click()
  flushSync()
  expect(btn.textContent).toContain(`Open all`)

  // user opens a single <details> directly - the DOM open property is not
  // reactive, so the label must update via the native toggle event
  const details = doc_query<HTMLDetailsElement>(`details`)
  details.open = true
  details.dispatchEvent(new Event(`toggle`))
  flushSync()
  expect(btn.textContent).toContain(`Close all`)
})

test(`toggle all label reflects pre-opened details on mount`, async () => {
  const files = [
    { title: `file1`, content: `content1` },
    { title: `file2`, content: `content2` },
  ]
  // details render open from the start - the toggle event never fires on mount,
  // so the label must be initialized from node_refs in the sync $effect
  mount(FileDetails, {
    target: document.body,
    props: { files, details_props: { open: true } },
  })
  await tick()

  expect(doc_query<HTMLDetailsElement>(`details`).open).toBe(true)
  expect(doc_query(`button[title='Toggle all']`).textContent).toContain(`Close all`)
})

test(`node refs are trimmed when files are removed to prevent memory leaks`, async () => {
  type FileWithNode = { title: string; content: string; node?: HTMLDetailsElement | null }
  const reactive_files: FileWithNode[] = $state([
    { title: `file1`, content: `content1` },
    { title: `file2`, content: `content2` },
    { title: `file3`, content: `content3` },
  ])

  mount(FileDetails, {
    target: document.body,
    props: {
      get files() {
        return reactive_files
      },
      set files(val) {
        reactive_files.splice(0, reactive_files.length, ...val)
      },
    },
  })
  await tick()

  // All 3 files should have node refs
  expect(document.querySelectorAll(`details`)).toHaveLength(3)
  for (const file of reactive_files) {
    expect(file.node).toBeInstanceOf(HTMLDetailsElement)
  }

  // Store references to the old nodes before removal
  const old_nodes = reactive_files.map((file) => file.node)

  // Remove the last file
  flushSync(() => {
    reactive_files.pop()
  })
  await tick()

  // Only 2 files should remain with valid node refs
  expect(document.querySelectorAll(`details`)).toHaveLength(2)
  expect(reactive_files).toHaveLength(2)
  for (const file of reactive_files) {
    expect(file.node).toBeInstanceOf(HTMLDetailsElement)
  }

  // The removed file's node should no longer be in the DOM
  expect(document.body.contains(old_nodes[2] ?? null)).toBe(false)
})
