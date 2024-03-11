import { CmdPalette } from '$lib'
import { tick } from 'svelte'
import { expect, test, vi } from 'vitest'
import { doc_query } from '.'

const actions = [{ label: `action 1`, action: vi.fn() }]

test.each([[[`k`]], [[`o`]], [[`k`, `o`]]])(
  `opens the dialog on cmd+ custom trigger keys`,
  async (triggers) => {
    new CmdPalette({ target: document.body, props: { triggers, actions } })

    // dialog should initially be absent
    expect(document.querySelector(`dialog`)).toBe(null)

    // press cmd + trigger to open the palette
    window.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: triggers[0], metaKey: true }),
    )
    await tick()
    expect(doc_query(`dialog`)).toBeTruthy()
  },
)

test(`calls the action when an option is selected`, async () => {
  const spy = vi.fn()
  const actions = [{ label: `action 1`, action: spy }]
  new CmdPalette({ target: document.body, props: { open: true, actions } })

  const input = doc_query(`dialog div.multiselect input[autocomplete]`)
  // press down arrow, then enter to select the first action
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))
  await tick()
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter` }))

  expect(spy).toHaveBeenCalledOnce()
  expect(spy).toHaveBeenCalledWith(actions[0].label)
})

test.each([[[`Escape`]], [[`x`]], [[`Escape`, `x`]]])(
  `closes the dialog on close keys`,
  async (close_keys) => {
    const component = new CmdPalette({
      target: document.body,
      props: { open: true, close_keys, actions },
    })

    const dialog = doc_query(`dialog`)
    expect(dialog).toBeTruthy()

    window.dispatchEvent(new KeyboardEvent(`keydown`, { key: close_keys[0] }))
    expect(component.open).toBe(false)
    // TODO somehow dialog isn't removed from the DOM
    // expect(document.querySelector(`dialog`)).toBe(null)
  },
)

test(`closes the dialog on click outside`, async () => {
  const component = new CmdPalette({
    target: document.body,
    props: { open: true, actions },
  })

  const dialog = doc_query(`dialog`)
  expect(dialog).toBeTruthy()

  // create a click event outside the dialog
  const click = new MouseEvent(`click`, { bubbles: true })
  document.body.dispatchEvent(click)

  expect(component.open).toBe(false)
})
