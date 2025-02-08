import { CmdPalette } from '$lib'
import { flushSync, mount } from 'svelte'
import { expect, test, vi } from 'vitest'
import { doc_query } from '.'

const actions = [{ label: `action 1`, action: vi.fn() }]

test.each([[[`k`]], [[`o`]], [[`k`, `o`]]])(
  `opens the dialog on cmd+ custom trigger keys`,
  async (triggers) => {
    mount(CmdPalette, { target: document.body, props: { triggers, actions } })

    // dialog should initially be absent
    expect(document.querySelector(`dialog`)).toBe(null)

    // press cmd + trigger to open the palette
    window.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: triggers[0], metaKey: true }),
    )
    flushSync()

    expect(doc_query(`dialog`)).toBeTruthy()
  },
)

test(`calls the action when an option is selected`, async () => {
  const spy = vi.fn()
  const actions = [{ label: `action 1`, action: spy }]

  mount(CmdPalette, { target: document.body, props: { open: true, actions } })

  const input = doc_query(`dialog div.multiselect input[autocomplete]`)
  // press down arrow, then enter to select the first action
  input.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `ArrowDown`, bubbles: true }),
  )
  flushSync()
  input.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }),
  )
  flushSync()

  expect(spy).toHaveBeenCalledOnce()
  expect(spy).toHaveBeenCalledWith(actions[0].label)
})

test.each([[[`Escape`]], [[`x`]], [[`Escape`, `x`]]])(
  `closes the dialog on close keys`,
  async (close_keys) => {
    const props = $state({ open: true, close_keys, actions })

    mount(CmdPalette, {
      target: document.body,
      props,
    })

    const dialog = doc_query(`dialog`)
    expect(dialog).toBeTruthy()

    window.dispatchEvent(new KeyboardEvent(`keydown`, { key: close_keys[0] }))
    expect(props.open).toBe(false)
    // TODO somehow dialog isn't removed from the DOM
    // expect(document.querySelector(`dialog`)).toBe(null)
  },
)

test(`closes the dialog on click outside`, async () => {
  const props = $state({ open: true, actions })

  mount(CmdPalette, {
    target: document.body,
    props,
  })

  const dialog = doc_query(`dialog`)
  expect(dialog).toBeTruthy()

  // create a click event outside the dialog
  const click = new MouseEvent(`click`, { bubbles: true })
  document.body.dispatchEvent(click)

  expect(props.open).toBe(false)
})
