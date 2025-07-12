import { CodeExample, CopyButton } from '$lib'
import { mount, tick } from 'svelte'
import { expect, test } from 'vitest'
import { doc_query } from './index'

const [id, src] = [`uniq-id`, `some code`]

test.each([[true, false]])(
  `CodeExample toggles class .open on <pre> on button click`,
  async (collapsible) => {
    const meta = { collapsible, id }

    mount(CodeExample, { target: document.body, props: { meta, src } })

    expect(doc_query(`div.code-example#${id}`)).toBeInstanceOf(HTMLDivElement)

    if (collapsible) {
      expect(document.querySelector(`pre.open`)).toBeNull()
      doc_query(`nav > button`).click()
      await tick()
      expect(document.querySelector(`pre.open`)).toBeInstanceOf(HTMLElement)
    }
  },
)

test(`renders a <pre> with the src`, () => {
  mount(CodeExample, { target: document.body, props: { src } })

  expect(doc_query(`pre > code`).textContent).toBe(src)
})

test(`renders nav with button when collapsible is true`, () => {
  const meta = { collapsible: true }
  mount(CodeExample, { target: document.body, props: { src, meta } })

  expect(document.querySelector(`nav`)).toBeInstanceOf(HTMLElement)
  expect(document.querySelector(`nav > button`)).toBeInstanceOf(HTMLButtonElement)
})

test(`renders links in nav when repl is provided`, () => {
  const meta = { collapsible: true, repl: `https://svelte.dev/repl` }
  mount(CodeExample, { target: document.body, props: { src, meta } })

  const repl_link = document.querySelector(`nav a[href="${meta.repl}"]`)
  expect(repl_link).toBeInstanceOf(HTMLAnchorElement)
  expect(repl_link?.getAttribute(`target`)).toBe(`_blank`)
})

test(`renders GitHub link when github and repo are provided`, () => {
  const meta = {
    collapsible: true,
    github: true,
    repo: `https://github.com/janosh/svelte-multiselect`,
    file: `src/lib/CodeExample.svelte`,
  }
  mount(CodeExample, { target: document.body, props: { src, meta } })

  const github_link = document.querySelector(`nav a[href*="github.com"]`)
  expect(github_link).toBeInstanceOf(HTMLAnchorElement)
  expect(github_link?.getAttribute(`target`)).toBe(`_blank`)
})

test(`dynamically added pre > code elements get copy buttons applied`, async () => {
  // Mount a CopyButton with global enabled to activate MutationObserver
  mount(CopyButton, { target: document.body, props: { global: true } })

  // Create a new pre > code element dynamically
  const new_pre = document.createElement(`pre`)
  const new_code = document.createElement(`code`)
  new_code.textContent = `dynamically added code`
  new_pre.appendChild(new_code)

  // Add it to the DOM
  document.body.appendChild(new_pre)
  await tick()

  // Verify that a copy button was added to the new pre element
  const copy_button = new_pre.querySelector(`button`)
  expect(copy_button).toBeInstanceOf(HTMLButtonElement)
  expect(copy_button?.style.position).toBe(`absolute`)
})
