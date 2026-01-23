import { FileDetails } from '$lib'
import { flushSync, mount, tick } from 'svelte'
import { expect, test } from 'vitest'
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

  // Check contents
  const contents = document.querySelectorAll(`pre > code`)
  files.forEach((file, idx) => expect(contents[idx].textContent).toBe(file.content))
})

test(`toggle all button opens, closes, and handles partial open state`, async () => {
  const files = [
    { title: `file1`, content: `content1` },
    { title: `file2`, content: `content2` },
    { title: `file3`, content: `content3` },
  ]

  const toggle_all_btn_title = `toggle all`
  mount(FileDetails, {
    target: document.body,
    props: { files, toggle_all_btn_title },
  })
  await tick()

  const details = Array.from(document.querySelectorAll(`details`))
  const btn = doc_query(`button[title='${toggle_all_btn_title}']`)

  // Initially all closed
  for (const detail of details) {
    expect(detail.open).toBe(false)
  }

  // Click to open all
  btn.click()
  for (const [idx, detail] of details.entries()) {
    expect(detail.open, `detail ${idx} after open`).toBe(true)
  }

  // Click to close all
  btn.click()
  for (const [idx, detail] of details.entries()) {
    expect(detail.open, `detail ${idx} after close`).toBe(false)
  }

  // Manually open some details, then click to close all
  details[0].open = true
  details[1].open = true
  btn.click()
  for (const [idx, detail] of details.entries()) {
    expect(detail.open, `detail ${idx} after partial close`).toBe(false)
  }
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
