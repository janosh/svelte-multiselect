import { FileDetails } from '$lib'
import { mount } from 'svelte'
import { describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'
import TestSnippetHarness from './TestSnippetHarness.svelte'

describe(`FileDetails`, () => {
  const all_text = (selector: string) =>
    [...document.querySelectorAll(selector)].map((node) => node.textContent)

  test(`renders empty default file list`, () => {
    mount(FileDetails, { target: document.body })

    expect(document.querySelector(`ol`)).toBeInstanceOf(HTMLOListElement)
    expect(document.querySelectorAll(`button, li`)).toHaveLength(0)
  })

  test(`renders files with inferred languages and custom container`, () => {
    mount(FileDetails, {
      target: document.body,
      props: {
        as: `ul`,
        class: `files-list`,
        default_lang: `txt`,
        files: [
          { title: `<code>component.svelte</code>`, content: `<h1>Hello</h1>` },
          { title: `script.ts`, content: `const answer = 42` },
          { title: `README`, content: `plain text` },
          { title: `explicit.svelte`, language: `ts`, content: `let explicit = true` },
        ],
      },
    })

    expect(document.querySelector(`ul.files-list`)).toBeInstanceOf(HTMLUListElement)
    expect(all_text(`summary`)).toEqual([
      `component.svelte`,
      `script.ts`,
      `README`,
      `explicit.svelte`,
    ])
    expect(all_text(`.lang-label`)).toEqual([`svelte`, `typescript`, `txt`, `ts`])
  })

  test(`single file omits toggle-all button and forwards details toggle event`, () => {
    const ontoggle = vi.fn()
    mount(FileDetails, {
      target: document.body,
      props: {
        details_props: { open: true, ontoggle },
        files: [{ title: `config.yml`, content: `name: test` }],
      },
    })

    expect(document.querySelector(`button`)).toBeNull()
    const details = doc_query<HTMLDetailsElement>(`details`)
    expect(details.open).toBe(true)

    details.dispatchEvent(new Event(`toggle`))
    expect(ontoggle).toHaveBeenCalledWith(expect.any(Event))
    expect(doc_query(`.lang-label`).textContent).toBe(`yaml`)
  })

  test(`title snippet renders title content and receives index`, () => {
    mount(TestSnippetHarness, {
      target: document.body,
      props: {
        component: `file-details`,
        files: [
          { title: `first.ts`, content: `const first = true` },
          { title: `second.py`, content: `second = True` },
        ],
      },
    })

    expect(all_text(`[data-testid="file-title"]`)).toEqual([`first.ts`, `second.py`])
    expect(
      [...document.querySelectorAll<HTMLElement>(`[data-testid="file-title"]`)].map(
        (node) => node.dataset.idx,
      ),
    ).toEqual([`0`, `1`])
  })

  test(`empty title renders details without summary`, () => {
    mount(FileDetails, {
      target: document.body,
      props: { files: [{ title: ``, content: `untitled` }] },
    })

    expect(document.querySelector(`details`)).toBeInstanceOf(HTMLDetailsElement)
    expect(document.querySelector(`summary`)).toBeNull()
  })

  test(`title snippet renders summary even for empty title`, () => {
    mount(TestSnippetHarness, {
      target: document.body,
      props: {
        component: `file-details`,
        files: [{ title: ``, content: `untitled` }],
      },
    })

    expect(document.querySelector(`summary`)).toBeInstanceOf(HTMLElement)
    expect(doc_query(`[data-testid="file-title"]`).textContent).toBe(``)
  })
})
