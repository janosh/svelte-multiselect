// Tests for async (Promise-returning) oncreate callbacks
import { createRawSnippet, mount, tick } from 'svelte'
import { afterEach, expect, test, vi } from 'vite-plus/test'

import type { Option } from '$lib'
import MultiSelect from '$lib'
import type { MultiSelectProps } from '$lib/types'
import { get_label } from '$lib/utils'

import { doc_query } from './index'

type OncreateResult = false | Option | undefined

const console_methods = { error: console.error }
afterEach(() => Object.assign(console, console_methods))

// type text into the search input to set searchText
async function type_search_text(search_text: string): Promise<HTMLInputElement> {
  const input = doc_query<HTMLInputElement>(`input[autocomplete]`)
  input.value = search_text
  input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
  await tick()
  return input
}

// dispatch a fresh Enter keydown per call — happy-dom does not reset the
// stop-propagation flag, so event instances must never be reused
function press_enter(input: HTMLInputElement): void {
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }))
}

// manually-controlled promise so tests decide exactly when oncreate settles
function make_deferred<T>() {
  let resolve_fn: (value: T) => void = () => {}
  let reject_fn: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((resolve, reject) => {
    resolve_fn = resolve
    reject_fn = reject
  })
  return { promise, resolve_fn, reject_fn }
}

test(`async oncreate resolving undefined adds typed option after resolve, spinner shown only while pending`, async () => {
  const { promise, resolve_fn } = make_deferred<OncreateResult>()
  const oncreate = vi.fn(() => promise)
  const onadd = vi.fn()
  const spinner = createRawSnippet(() => ({
    render: () => `<span class="custom-spinner">creating</span>`,
  }))
  const props = $state<MultiSelectProps>({
    options: [`foo`, `bar`],
    selected: [],
    allowUserOptions: true,
    oncreate,
    onadd,
    spinner,
  })
  mount(MultiSelect, { target: document.body, props })

  const input = await type_search_text(`new async option`)
  expect(document.querySelector(`.custom-spinner`)).toBeNull()
  expect(input.getAttribute(`aria-busy`)).toBeNull()

  press_enter(input)
  await tick()

  expect(oncreate).toHaveBeenCalledTimes(1)
  expect(oncreate).toHaveBeenCalledWith({ option: `new async option` })
  // while the promise is pending: spinner visible, input busy, nothing added yet
  expect(doc_query(`.custom-spinner`).textContent).toBe(`creating`)
  expect(input.getAttribute(`aria-busy`)).toBe(`true`)
  expect(props.selected).toEqual([])
  expect(onadd).not.toHaveBeenCalled()

  resolve_fn(undefined)
  await promise
  await tick()

  expect(document.querySelector(`.custom-spinner`)).toBeNull()
  expect(input.getAttribute(`aria-busy`)).toBeNull()
  expect(props.selected).toEqual([`new async option`])
  expect(onadd).toHaveBeenCalledTimes(1)
  expect(onadd).toHaveBeenCalledWith({
    option: `new async option`,
    selected: [`new async option`],
  })
})

test.each<[string, OncreateResult, Option[], number]>([
  [`undefined keeps the original option`, undefined, [`fresh-opt`], 1],
  [`a transformed option replaces the original`, `TRANSFORMED`, [`TRANSFORMED`], 1],
  [`false aborts the add`, false, [], 0],
])(
  `async oncreate resolving %s`,
  async (_label, resolved_value, expected_selected, expected_onadd_calls) => {
    console.error = vi.fn()
    const { promise, resolve_fn } = make_deferred<OncreateResult>()
    const onadd = vi.fn()
    const props = $state<MultiSelectProps>({
      options: [`foo`, `bar`],
      selected: [],
      allowUserOptions: true,
      oncreate: () => promise,
      onadd,
    })
    mount(MultiSelect, { target: document.body, props })

    const input = await type_search_text(`fresh-opt`)
    press_enter(input)
    await tick()

    resolve_fn(resolved_value)
    await promise
    await tick()

    expect(props.selected).toEqual(expected_selected)
    expect(onadd).toHaveBeenCalledTimes(expected_onadd_calls)
    expect(console.error).not.toHaveBeenCalled()
  },
)

test(`async oncreate rejecting adds nothing and logs console.error`, async () => {
  console.error = vi.fn()
  const { promise, reject_fn } = make_deferred<OncreateResult>()
  const onadd = vi.fn()
  const props = $state<MultiSelectProps>({
    options: [`foo`],
    selected: [],
    allowUserOptions: true,
    oncreate: () => promise,
    onadd,
  })
  mount(MultiSelect, { target: document.body, props })

  const input = await type_search_text(`doomed-opt`)
  press_enter(input)
  await tick()
  expect(input.getAttribute(`aria-busy`)).toBe(`true`)

  const rejection = new Error(`backend validation failed`)
  reject_fn(rejection)
  await promise.catch(() => {})
  await tick()

  expect(props.selected).toEqual([])
  expect(onadd).not.toHaveBeenCalled()
  expect(console.error).toHaveBeenCalledTimes(1)
  expect(console.error).toHaveBeenCalledWith(
    `MultiSelect: oncreate promise rejected:`,
    rejection,
  )
  // busy state must reset even on rejection
  expect(input.getAttribute(`aria-busy`)).toBeNull()
})

test(`double Enter while async create is pending adds only one option`, async () => {
  const { promise, resolve_fn } = make_deferred<OncreateResult>()
  const oncreate = vi.fn(() => promise)
  const props = $state<MultiSelectProps>({
    options: [`foo`],
    selected: [],
    allowUserOptions: true,
    oncreate,
  })
  mount(MultiSelect, { target: document.body, props })

  const input = await type_search_text(`only-once`)
  press_enter(input)
  await tick()
  press_enter(input) // second Enter while the first create is still pending
  await tick()

  expect(oncreate).toHaveBeenCalledTimes(1)

  resolve_fn(undefined)
  await promise
  await tick()

  expect(props.selected).toEqual([`only-once`])
})

test.each<[string, MultiSelectProps[`oncreate`], Option[]]>([
  [`returning false blocks the option`, () => false, []],
  [
    `returning an option transforms it`,
    ({ option }) => `${get_label(option)}`.toUpperCase(),
    [`SYNC-OPT`],
  ],
  [`returning undefined keeps the original option`, () => undefined, [`sync-opt`]],
])(`sync oncreate regression: %s`, async (_label, oncreate, expected_selected) => {
  const props = $state<MultiSelectProps>({
    options: [`foo`],
    selected: [],
    allowUserOptions: true,
    oncreate,
  })
  mount(MultiSelect, { target: document.body, props })

  const input = await type_search_text(`sync-opt`)
  press_enter(input)
  await tick()

  expect(props.selected).toEqual(expected_selected)
})
