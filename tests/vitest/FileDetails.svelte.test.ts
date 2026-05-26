import { FileDetails } from '$lib'
import { flushSync, mount, tick } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

test(`FileDetails renders files in ordered list with titles and contents`, () => {
  const files = [
    { title: `file1`, content: `content1` },
    { title: `file2`, content: `content2` },
  ]
  mount(FileDetails, { target: document.body, props: { files } })

  // Check structure: ordered list with details elements
  expect(doc_query(`ol`).children.length).toBe(2)
  expect(document.querySelectorAll(`li > details`).length).toBe(2)
  expect(document.querySelectorAll(`summary`).length).toBe(2)

  // Check titles and contents
  const summaries = document.querySelectorAll(`summary`)
  const contents = document.querySelectorAll(`pre > code`)
  files.forEach((file, idx) => {
    expect(summaries[idx].textContent).toBe(file.title)
    expect(contents[idx].textContent).toBe(file.content)
  })
})

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
  `pre element gets language-$expected_lang class for "$file.title"`,
  ({ file, expected_lang }) => {
    mount(FileDetails, { target: document.body, props: { files: [file] } })
    expect(doc_query(`pre`).className).toContain(`language-${expected_lang}`)
  },
)

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
  details[0].open = details[1].open = true
  btn.click()
  expect(all_closed()).toBe(true)
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
  expect(document.querySelectorAll(`details`).length).toBe(3)
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
  expect(document.querySelectorAll(`details`).length).toBe(2)
  expect(reactive_files.length).toBe(2)
  for (const file of reactive_files) {
    expect(file.node).toBeInstanceOf(HTMLDetailsElement)
  }

  // The removed file's node should no longer be in the DOM
  expect(document.body.contains(old_nodes[2] ?? null)).toBe(false)
})
