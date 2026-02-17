import { CodeExample, CopyButton } from '$lib'
import { mount, tick } from 'svelte'
import { expect, test } from 'vitest'
import { doc_query } from './index'

const [id, src] = [`uniq-id`, `some code`]

test(`CodeExample toggles class .open on <pre> on button click`, async () => {
  const meta = { collapsible: true, id }

  mount(CodeExample, { target: document.body, props: { meta, src } })

  expect(doc_query(`div.code-example#${id}`)).toBeInstanceOf(HTMLDivElement)
  expect(document.querySelector(`nav`)).toBeInstanceOf(HTMLElement)

  const toggle_button = doc_query<HTMLButtonElement>(`nav > button`)
  expect(toggle_button.textContent).toContain(`View code`)
  expect(document.querySelector(`pre.open`)).toBeNull()

  toggle_button.click()
  await tick()

  expect(document.querySelector(`pre.open`)).toBeInstanceOf(HTMLElement)
  expect(toggle_button.textContent).toContain(`Close`)
})

test(`renders a <pre> with the src`, () => {
  mount(CodeExample, { target: document.body, props: { src } })

  expect(doc_query(`pre > code`).textContent).toBe(src)
})

test(`renders links in nav when repl is provided`, () => {
  const meta = { collapsible: true, repl: `https://svelte.dev/playground` }
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

test(`prevents duplicate copy buttons when as !== button`, async () => {
  // Mount a CopyButton with global enabled and as='a' to test duplicate prevention
  mount(CopyButton, { target: document.body, props: { global: true, as: `a` } })

  // Create a pre > code element
  const pre = document.createElement(`pre`)
  const code = document.createElement(`code`)
  code.textContent = `test code`
  pre.appendChild(code)
  document.body.appendChild(pre)
  await tick()

  // Verify only one copy button (anchor) was created
  const copy_buttons = pre.querySelectorAll(`a[data-sms-copy]`)
  expect(copy_buttons).toHaveLength(1)

  // Trigger MutationObserver again by modifying the pre element
  pre.setAttribute(`data-test`, `modified`)
  await tick()

  // Verify no duplicate was created
  const copy_buttons_after = pre.querySelectorAll(`a[data-sms-copy]`)
  expect(copy_buttons_after).toHaveLength(1)
})
