import { mount, tick, unmount } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
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
  const onclick = vi.fn()
  const props = {
    id: `host-id`,
    meta: { collapsible: true, id },
    src,
    button_props: { onclick },
  }
  mount(CodeExample, { target: document.body, props })

  // collapsible defaults code_above to true, which orders the <pre> above the example
  expect(doc_query(`div.code-example#${id}`).classList.contains(`code-above`)).toBe(true)
  expect(document.querySelector(`nav`)).not.toBeNull()

  const toggle_button = doc_query<HTMLButtonElement>(`nav > button`)
  expect(toggle_button.textContent).toContain(`View code`)
  const pre_closed = doc_query<HTMLPreElement>(`pre`)
  expect(pre_closed.classList.contains(`open`)).toBe(false)
  const { maxHeight, overflow } = getComputedStyle(pre_closed)
  expect([maxHeight, overflow]).toEqual([`0`, `hidden`])

  toggle_button.click()
  await tick()

  const { overflowX, overflowY } = getComputedStyle(doc_query(`pre.open`))
  expect([overflowX, overflowY]).toEqual([`auto`, `auto`])
  expect(doc_query(`pre.open > code`).textContent).toBe(src)
  expect(toggle_button.textContent).toContain(`Close`)
  expect(onclick).toHaveBeenCalledOnce()
})

test(`forwards host attributes when metadata does not override the ID`, () => {
  mount(CodeExample, {
    target: document.body,
    props: {
      id: `host-id`,
      class: `host-class`,
      style: `max-width: 40rem`,
      'data-testid': `example`,
    },
  })
  const host = doc_query(`div.code-example`)
  expect([host.id, host.classList.contains(`host-class`), host.style.maxWidth]).toEqual([
    `host-id`,
    true,
    `40rem`,
  ])
  expect(host.dataset.testid).toBe(`example`)
})

// both links always render and toggle via display, so a lost `cond` ships a dead link
test.each([
  [
    `Svelte`,
    { collapsible: true, repl: `https://svelte.dev/playground` },
    `https://svelte.dev/playground`,
  ],
  [
    `GitHub`,
    {
      collapsible: true,
      github: true,
      repo: `https://github.com/janosh/svelte-widgets`,
      file: `src/lib/CodeExample.svelte`,
    },
    `https://github.com/janosh/svelte-widgets/blob/-/src/lib/CodeExample.svelte`,
  ],
] as const)(
  `renders the %s link in nav and hides the unconfigured one`,
  (shown_title, meta, expected_href) => {
    mount(CodeExample, { target: document.body, props: { meta, src } })
    const link = (title: string) =>
      doc_query<HTMLAnchorElement>(`nav a[title="${title}"]`)

    expect(link(shown_title).getAttribute(`href`)).toBe(expected_href)
    expect(link(shown_title).getAttribute(`target`)).toBe(`_blank`)
    expect(link(shown_title).getAttribute(`rel`)).toBe(`noreferrer`)
    expect(link(shown_title).style.display).toBe(`inline-block`)
    expect(link(shown_title === `Svelte` ? `GitHub` : `Svelte`).style.display).toBe(
      `none`,
    )
  },
)

// github: true must link to the file serving the current page; the mdsvex transform
// emits that path as meta.filename, so it must work as fallback when meta.file is unset.
// a string github is instead an explicit blob path, needing no file/filename at all
test.each([
  [
    `true + meta.file`,
    { github: true, file: `src/lib/CodeExample.svelte` },
    `src/lib/CodeExample.svelte`,
  ],
  [
    `true + meta.filename (set by mdsvex transform)`,
    { github: true, filename: `src/routes/(demos)/(attachments)/attachments/+page.md` },
    `src/routes/(demos)/(attachments)/attachments/+page.md`,
  ],
  [`string`, { github: `docs/example.svelte` }, `docs/example.svelte`],
])(`github: %s links to its blob path`, (_label, github_meta, expected_path) => {
  const repo = `https://github.com/janosh/svelte-widgets`
  const meta = { repo, ...github_meta }
  mount(CodeExample, { target: document.body, props: { meta, src } })

  const link = doc_query<HTMLAnchorElement>(`nav a[href*="github.com"]`)
  expect(link.getAttribute(`href`)).toBe(`${repo}/blob/-/${expected_path}`)
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
