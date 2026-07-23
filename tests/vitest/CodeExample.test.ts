import { mount, tick, unmount } from 'svelte'
import { expect, test } from 'vite-plus/test'
import CodeExample from '$lib/CodeExample.svelte'
import CopyButton from '$lib/CopyButton.svelte'
import { doc_query } from './index'

const [id, src] = [`uniq-id`, `some code`]

const mount_global_copy_button = (props: Record<string, unknown> = {}) =>
  mount(CopyButton, {
    target: document.body,
    props: { global: true, ...props },
  })

const append_code_block = (text: string) => {
  const pre = document.createElement(`pre`)
  const code = document.createElement(`code`)
  code.textContent = text
  pre.append(code)
  document.body.append(pre)
  return pre
}

test(`CodeExample toggles class .open on <pre> on button click`, async () => {
  const meta = { collapsible: true, id }

  mount(CodeExample, { target: document.body, props: { meta, src } })

  expect(doc_query(`div.code-example#${id}`)).toBeInstanceOf(HTMLDivElement)
  expect(document.querySelector(`nav`)).toBeInstanceOf(HTMLElement)

  const toggle_button = doc_query<HTMLButtonElement>(`nav > button`)
  expect(toggle_button.textContent).toContain(`View code`)
  const pre_closed = doc_query<HTMLPreElement>(`pre`)
  const closed_style = getComputedStyle(pre_closed)
  expect(pre_closed.classList.contains(`open`)).toBe(false)
  expect(closed_style.maxHeight).toBe(`0`)
  expect(closed_style.overflow).toBe(`hidden`)

  toggle_button.click()
  await tick()

  const pre = doc_query<HTMLPreElement>(`pre.open`)
  const open_style = getComputedStyle(pre)
  expect(pre).toBeInstanceOf(HTMLElement)
  expect(doc_query(`pre.open > code`).textContent).toBe(src)
  expect(open_style.overflowX).toBe(`auto`)
  expect(open_style.overflowY).toBe(`auto`)
  expect(toggle_button.textContent).toContain(`Close`)
})

test.each([
  [
    `REPL`,
    { collapsible: true, repl: `https://svelte.dev/playground` },
    `nav a[href="https://svelte.dev/playground"]`,
  ],
  [
    `GitHub`,
    {
      collapsible: true,
      github: true,
      repo: `https://github.com/janosh/svelte-multiselect`,
      file: `src/lib/CodeExample.svelte`,
    },
    `nav a[href*="github.com"]`,
  ],
] as const)(`renders %s link in nav`, (_label, meta, selector) => {
  mount(CodeExample, { target: document.body, props: { meta, src } })

  const link = doc_query<HTMLAnchorElement>(selector)
  expect(link).toBeInstanceOf(HTMLAnchorElement)
  expect(link.getAttribute(`target`)).toBe(`_blank`)
})

// github: true must link to the file serving the current page; the mdsvex transform
// emits that path as meta.filename, so it must work as fallback when meta.file is unset
test.each([
  [`meta.file`, { file: `src/lib/CodeExample.svelte` }, `src/lib/CodeExample.svelte`],
  [
    `meta.filename (set by mdsvex transform)`,
    { filename: `src/routes/(demos)/(integration)/attachments/+page.md` },
    `src/routes/(demos)/(integration)/attachments/+page.md`,
  ],
])(`github: true links to blob path from %s`, (_label, file_meta, expected_path) => {
  const repo = `https://github.com/janosh/svelte-multiselect`
  const meta = { github: true, repo, ...file_meta }
  mount(CodeExample, { target: document.body, props: { meta, src } })

  const link = doc_query<HTMLAnchorElement>(`nav a[href*="github.com"]`)
  expect(link.getAttribute(`href`)).toBe(`${repo}/blob/-/${expected_path}`)
})

// string github is an explicit blob path — must link there even without file/filename
test(`github as string links to its path without file/filename meta`, () => {
  const repo = `https://github.com/janosh/svelte-multiselect`
  const meta = { github: `docs/example.svelte`, repo }
  mount(CodeExample, { target: document.body, props: { meta, src } })

  const link = doc_query<HTMLAnchorElement>(`nav a[href*="github.com"]`)
  expect(link.getAttribute(`href`)).toBe(`${repo}/blob/-/docs/example.svelte`)
})

test.each([`typescript`, `css`])(
  `lang-label renders %s out of flow so it can't indent the first code line`,
  (lang) => {
    mount(CodeExample, { target: document.body, props: { src, meta: { lang } } })

    const label = doc_query<HTMLSpanElement>(`.lang-label`)
    expect(label.textContent).toBe(lang)
    // pre is white-space: pre, so an in-flow label shifts the first code line right.
    // absolute positioning takes it out of flow (regression guard, see CodeExample.svelte)
    expect(getComputedStyle(label).position).toBe(`absolute`)
  },
)

test(`lang-label is omitted when meta.lang is unset`, () => {
  mount(CodeExample, { target: document.body, props: { src } })

  expect(document.querySelector(`.lang-label`)).toBeNull()
})

test(`dynamically added pre > code elements get copy buttons applied`, async () => {
  const copy_button_component = mount_global_copy_button()
  const new_pre = append_code_block(`dynamically added code`)
  await tick()

  const copy_button = new_pre.querySelector(`button`)
  expect(copy_button).toBeInstanceOf(HTMLButtonElement)
  expect(copy_button?.style.position).toBe(`absolute`)
  void unmount(copy_button_component)
})

test(`prevents duplicate copy buttons when as !== button`, async () => {
  const copy_button_component = mount_global_copy_button({ as: `a` })
  const pre = append_code_block(`test code`)
  await tick()

  const copy_buttons = pre.querySelectorAll(`a[data-sms-copy]`)
  expect(copy_buttons).toHaveLength(1)

  pre.setAttribute(`data-test`, `modified`)
  await tick()

  const copy_buttons_after = pre.querySelectorAll(`a[data-sms-copy]`)
  expect(copy_buttons_after).toHaveLength(1)
  void unmount(copy_button_component)
})
