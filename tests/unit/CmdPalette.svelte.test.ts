import { CmdPalette } from '$lib'
import { expect, test, vi } from 'vitest'
import { fireKeyDownArrowDown, fireKeyDownEnter, queryWithFail } from './utils'
import { fireEvent, render } from '@testing-library/svelte'

const actions = [{ label: `action 1`, action: vi.fn() }]

test.each([[[`k`]], [[`o`]], [[`k`, `o`]]])(
  `opens the dialog on cmd+ custom trigger keys`,
  async (triggers) => {
    render(CmdPalette, { target: document.body, props: { triggers, actions } })

    // dialog should initially be absent
    expect(document.querySelector(`dialog`)).toBe(null)

    // press cmd + trigger to open the palette
    await fireEvent(
      window,
      new KeyboardEvent(`keydown`, { key: triggers[0], metaKey: true }),
    )

    expect(queryWithFail(`dialog`)).toBeTruthy()
  },
)

test(`calls the action when an option is selected`, async () => {
  const spy = vi.fn()
  const actions = [{ label: `action 1`, action: spy }]
  render(CmdPalette, { target: document.body, props: { open: true, actions } })

  const input = queryWithFail(`dialog div.multiselect input[autocomplete]`)

  // press down arrow, then enter to select the first action
  await fireKeyDownArrowDown(input)
  await fireKeyDownEnter(input)

  expect(spy).toHaveBeenCalledOnce()
  expect(spy).toHaveBeenCalledWith(actions[0].label)
})

test.each([[[`Escape`]], [[`x`]], [[`Escape`, `x`]]])(
  `closes the dialog on close keys`,
  async (close_keys) => {
    const props = $state({ open: true, close_keys, actions })

    render(CmdPalette, {
      target: document.body,
      props,
    })

    const dialog = queryWithFail(`dialog`)
    expect(dialog).toBeTruthy()

    await fireEvent(
      window,
      new KeyboardEvent(`keydown`, { key: close_keys[0] }),
    )

    expect(props.open).toBe(false)
    // TODO somehow dialog isn't removed from the DOM
    // expect(document.querySelector(`dialog`)).toBe(null)
  },
)

test(`closes the dialog on click outside`, async () => {
  const props = $state({ open: true, actions })

  render(CmdPalette, {
    target: document.body,
    props,
  })

  const dialog = queryWithFail(`dialog`)
  expect(dialog).toBeTruthy()

  // create a click event outside the dialog
  await fireEvent(document.body, new MouseEvent(`click`, { bubbles: true }))

  expect(props.open).toBe(false)
})
