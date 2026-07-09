// deno-lint-ignore-file no-await-in-loop
import { mount, tick } from 'svelte'
import { afterEach, expect, test, vi } from 'vite-plus/test'

import MultiSelect from '$lib'
import type { MultiSelectProps } from '$lib/types'

import { doc_query } from './index'

const console_methods = { error: console.error, warn: console.warn }
afterEach(() => Object.assign(console, console_methods))

const item_height = 30
const overscan = 5
const viewport_estimate = 400 // component falls back to 400px since happy-dom reports clientHeight 0
const n_options = 1000
const options = Array.from({ length: n_options }, (_, idx) => `option ${idx}`)
const virtual_props = {
  options,
  open: true,
  virtualList: { itemHeight: item_height, overscan },
} satisfies MultiSelectProps

// window math mirrored from the component (start = 0 before any scrolling)
const window_end = (scroll_top: number, extra_rows: number) =>
  Math.min(
    n_options,
    Math.ceil((scroll_top + viewport_estimate) / item_height) + extra_rows,
  )
const initial_end = window_end(0, overscan)

const get_rendered_options = () => [
  ...document.querySelectorAll<HTMLLIElement>(`ul.options li[role='option']`),
]
const get_spacers = () => [
  ...document.querySelectorAll<HTMLLIElement>(`ul.options li[aria-hidden='true']`),
]

test.each([
  [{ itemHeight: item_height, overscan }, initial_end],
  [true, window_end(0, 10)], // boolean form uses defaults itemHeight=30, overscan=10
  [false, n_options], // non-virtual sanity check: every option gets a DOM node
])(`virtualList=%j renders %i of ${n_options} options`, (virtualList, expected_count) => {
  mount(MultiSelect, {
    target: document.body,
    props: { options, open: true, virtualList },
  })

  expect(get_rendered_options()).toHaveLength(expected_count)
  expect(get_spacers()).toHaveLength(virtualList ? 2 : 0)
})

test(`spacers pad the rendered window to the full list height`, () => {
  mount(MultiSelect, { target: document.body, props: { ...virtual_props } })

  const [top_spacer, bottom_spacer] = get_spacers()
  expect(top_spacer.style.height).toBe(`0px`)
  expect(bottom_spacer.style.height).toBe(`${(n_options - initial_end) * item_height}px`)
})

test(`scrolling the dropdown re-windows which options are rendered`, async () => {
  mount(MultiSelect, { target: document.body, props: { ...virtual_props } })

  const ul_options = doc_query<HTMLUListElement>(`ul.options`)
  const scroll_top = 600
  // happy-dom has no layout, so fake the scroll offset and fire the event manually
  Object.defineProperty(ul_options, `scrollTop`, {
    value: scroll_top,
    configurable: true,
  })
  ul_options.dispatchEvent(new Event(`scroll`))
  await tick()

  const expected_start = Math.floor(scroll_top / item_height) - overscan // 15
  const rendered = get_rendered_options()
  expect(rendered[0]?.textContent?.trim()).toBe(`option ${expected_start}`)
  expect(rendered).toHaveLength(window_end(scroll_top, overscan) - expected_start)
  expect(get_spacers()[0].style.height).toBe(`${expected_start * item_height}px`)
})

test(`clicking a rendered option selects it`, async () => {
  const props = $state<MultiSelectProps>({ ...virtual_props, selected: [] })
  mount(MultiSelect, { target: document.body, props })

  get_rendered_options()[0].click()
  await tick()

  expect(props.selected).toEqual([`option 0`])
  expect(doc_query(`ul.selected > li`).textContent?.trim()).toContain(`option 0`)
})

test(`arrow keys keep the active option rendered beyond the initial window`, async () => {
  mount(MultiSelect, { target: document.body, props: { ...virtual_props } })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  const n_presses = 25 // activeIndex 24 lies past the initial window end of 19
  for (let press = 0; press < n_presses; press++) {
    // fresh KeyboardEvent per dispatch: happy-dom never resets the stop-propagation flag
    input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }))
    await tick()
  }
  await tick() // flush the async scroll adjustment in handle_arrow_navigation

  expect(doc_query(`ul.options li.active`).textContent?.trim()).toBe(
    `option ${n_presses - 1}`,
  )
  // the window scrolled down: option 0 is no longer rendered
  expect(get_rendered_options()[0]?.textContent?.trim()).not.toBe(`option 0`)
  expect(get_rendered_options().length).toBeLessThan(50)
})

test(`fuzzy search filtering still works in virtual mode`, async () => {
  mount(MultiSelect, { target: document.body, props: { ...virtual_props } })

  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = `999`
  input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
  await tick()

  const rendered = get_rendered_options()
  expect(rendered).toHaveLength(1)
  expect(rendered[0].textContent?.trim()).toBe(`option 999`)
  for (const spacer of get_spacers()) expect(spacer.style.height).toBe(`0px`)
})

test(`grouped options fall back to non-virtual rendering with a console.warn`, async () => {
  console.warn = vi.fn()
  const grouped_options = Array.from({ length: 50 }, (_, idx) => ({
    label: `option ${idx}`,
    group: `group ${idx % 5}`,
  }))
  mount(MultiSelect, {
    target: document.body,
    props: { options: grouped_options, open: true, virtualList: true },
  })
  await tick() // wait for validation $effect to run

  expect(console.warn).toHaveBeenCalledTimes(1)
  expect(console.warn).toHaveBeenCalledWith(
    `MultiSelect: virtualList only supports flat (ungrouped) option lists. ` +
      `Grouped options detected, falling back to non-virtual rendering.`,
  )
  expect(get_rendered_options()).toHaveLength(50) // fallback renders ALL options
  expect(get_spacers()).toHaveLength(0)
})
