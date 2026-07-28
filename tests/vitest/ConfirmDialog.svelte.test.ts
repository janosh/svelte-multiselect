import ConfirmDialog from '$lib/ConfirmDialog.svelte'
import type { DialogChoice } from '$lib/dialogs.svelte'
import { dialog_queue, request_choice } from '$lib/dialogs.svelte'
import { mount, tick, unmount } from 'svelte'
import { afterEach, expect, test } from 'vite-plus/test'
import { doc_query, track } from './index'

// happy-dom implements <dialog>: showModal(), .open, close() and the close event all
// behave, so nothing about the dialog is stubbed here. What it does not implement is
// Escape closing a modal dialog or a real ::backdrop, so those paths are driven the way
// the browser drives them: Escape by close(), a backdrop press by a click whose target
// is the dialog element itself.

const mounted: Record<string, unknown>[] = []
afterEach(() => {
  for (const app of mounted.splice(0)) void unmount(app)
  dialog_queue.length = 0
})

const flush = async () => {
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

const write_choices: DialogChoice<`cancel` | `write`>[] = [
  { id: `cancel`, label: `Cancel` },
  { id: `write`, label: `Write`, tone: `accent` },
]

const mount_dialog = async () => {
  mounted.push(mount(ConfirmDialog, { target: document.body }))
  await flush()
  return doc_query<HTMLDialogElement>(`dialog.confirm-dialog`)
}
const buttons = () => [
  ...document.querySelectorAll<HTMLButtonElement>(`dialog.confirm-dialog button`),
]
const ask = (message: string, title: string) =>
  track(request_choice(message, title, write_choices, `cancel`))

// happy-dom does no layout, so the dialog's box has to be supplied: a press on the
// ::backdrop and one on the dialog's own padding both target the dialog element, and
// only the pointer coordinates tell them apart.
const stub_rect = (dialog: HTMLDialogElement) => {
  const rect = { left: 100, top: 100, right: 300, bottom: 200, width: 200, height: 100 }
  dialog.getBoundingClientRect = () => rect as DOMRect
  return dialog
}
const press_at = (dialog: HTMLDialogElement, clientX: number, clientY: number) =>
  stub_rect(dialog).dispatchEvent(
    new MouseEvent(`click`, { bubbles: true, clientX, clientY }),
  )

test(`shows the queued question and closes once the queue drains`, async () => {
  const dialog = await mount_dialog()
  expect(dialog.open).toBe(false)
  expect(buttons()).toHaveLength(0)

  const answer = ask(`Overwrite src/lib?`, `Write files`)
  await flush()

  expect(dialog.open).toBe(true)
  expect(doc_query(`dialog h2`).textContent).toBe(`Write files`)
  expect(doc_query(`dialog p`).textContent).toBe(`Overwrite src/lib?`)
  expect(buttons().map((btn) => btn.textContent?.trim())).toEqual([`Cancel`, `Write`])
  // tone marks the answer to reach for, the dismiss choice stays plain
  expect(buttons().map((btn) => btn.classList.contains(`accent`))).toEqual([false, true])

  buttons()[1].click()
  await flush()
  expect([answer.settled, answer.value]).toEqual([true, `write`])
  expect(dialog.open).toBe(false)
  expect(buttons()).toHaveLength(0)
})

// The reason the queue exists. Two prompts racing in one modal would leave the second
// answered by a click meant for the first, and a double-click is how that happens.
test(`one click cannot answer two racing requests`, async () => {
  const dialog = await mount_dialog()
  const first = ask(`Delete node_modules?`, `First`)
  const second = ask(`Delete .git?`, `Second`)
  await flush()

  expect(doc_query(`dialog h2`).textContent).toBe(`First`)
  const stale_write_button = buttons()[1]

  stale_write_button.click()
  await flush()
  expect([first.settled, first.value]).toEqual([true, `write`])
  expect(second.settled).toBe(false)
  expect(doc_query(`dialog h2`).textContent).toBe(`Second`) // dialog stayed up

  // The second question offers the same choice ids, so without the {#key request} block
  // Svelte reuses these DOM nodes and the second half of a double-click lands on the
  // button that now answers a question nobody read.
  const fresh_write_button = buttons()[1]
  expect(fresh_write_button).not.toBe(stale_write_button)
  expect(stale_write_button.isConnected).toBe(false)

  stale_write_button.click() // second half of the double-click
  await flush()
  expect(second.settled).toBe(false)
  expect(dialog.open).toBe(true)

  fresh_write_button.click()
  await flush()
  expect([second.settled, second.value]).toEqual([true, `write`])
  expect(dialog.open).toBe(false)
})

// Dismissing is not consent: both paths have to answer with dismiss_id, never with the
// accented choice a stray key would otherwise reach.
test.each([
  [`Escape`, (dialog: HTMLDialogElement) => dialog.close()],
  [`a backdrop click`, (dialog: HTMLDialogElement) => press_at(dialog, 10, 10)],
])(`%s resolves with dismiss_id`, async (_desc, dismiss) => {
  const dialog = await mount_dialog()
  const answer = ask(`Overwrite?`, `Write files`)
  await flush()

  dismiss(dialog)
  await flush()

  expect([answer.settled, answer.value]).toEqual([true, `cancel`])
  expect(dialog.open).toBe(false)
})

test.each([
  [
    `on its content`,
    () =>
      doc_query(`dialog h2`).dispatchEvent(new MouseEvent(`click`, { bubbles: true })),
  ],
  // the padding belongs to the dialog, but the click lands on the dialog element there
  // just as a backdrop press does, so target alone would dismiss the question
  [`in its padding`, (dialog: HTMLDialogElement) => press_at(dialog, 105, 105)],
])(`a click %s is not a backdrop click`, async (_desc, click) => {
  const dialog = await mount_dialog()
  const answer = ask(`Overwrite?`, `Write files`)
  await flush()

  click(dialog)
  await flush()

  expect(answer.settled).toBe(false)
  expect(dialog.open).toBe(true)
})

// Answering removes the button that had focus. Without a hand-off the next question
// comes up with the keyboard on <body>, outside the trap.
test(`focus enters each question and returns to the opener`, async () => {
  const trigger = document.createElement(`button`)
  document.body.append(trigger)
  await mount_dialog()
  trigger.focus()

  ask(`First?`, `First`)
  await flush()
  expect(document.activeElement).toBe(buttons()[0])

  buttons()[0].click()
  await flush()
  expect(document.activeElement).toBe(trigger)

  ask(`Second?`, `Second`)
  await flush()
  const second_question_buttons = buttons()
  ask(`Third?`, `Third`)
  await flush()
  expect(document.activeElement).toBe(second_question_buttons[0])

  second_question_buttons[0].click()
  await flush()
  expect(document.activeElement).toBe(buttons()[0]) // moved on to the third question
})

test(`Tab is kept inside the dialog while a question is up`, async () => {
  const outside = document.createElement(`button`)
  document.body.append(outside)
  await mount_dialog()

  ask(`Overwrite?`, `Write files`)
  await flush()
  const [cancel_button, write_button] = buttons()

  const press_tab = (shift = false) =>
    document.activeElement?.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Tab`, shiftKey: shift, bubbles: true }),
    )

  expect(document.activeElement).toBe(cancel_button)
  press_tab()
  expect(document.activeElement).toBe(write_button)
  press_tab()
  expect(document.activeElement).toBe(cancel_button) // wrapped instead of reaching `outside`
  press_tab(true)
  expect(document.activeElement).toBe(write_button)
})
