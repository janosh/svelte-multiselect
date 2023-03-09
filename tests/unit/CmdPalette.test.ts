import { CmdPalette } from '$lib'
import { tick } from 'svelte'
import { expect, test, vi } from 'vitest'
import { doc_query } from '.'

test.each([[`k`], [`o`]])(`CircleSpinner prop size`, async (trigger) => {
  const spy = vi.fn()
  const actions = [{ label: `action 1`, action: spy }]
  new CmdPalette({ target: document.body, props: { trigger, actions } })

  // press cmd + k to open the palette
  window.dispatchEvent(
    new KeyboardEvent(`keydown`, { key: trigger, metaKey: true })
  )
  await tick()
  const dialog = doc_query(`dialog.open`)
  expect(dialog).toBeTruthy()

  const input = doc_query(`dialog.open div.multiselect input[autocomplete]`)
  // press down arrow, then enter to select the first action
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `ArrowDown` }))
  await tick()
  input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter` }))

  expect(spy).toHaveBeenCalledOnce()
})
