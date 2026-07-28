import type { DialogChoice } from '$lib/dialogs.svelte'
import {
  answer_dialog,
  ask_confirm,
  dialog_queue,
  request_choice,
} from '$lib/dialogs.svelte'
import { afterEach, expect, test } from 'vite-plus/test'
import { track } from './index'

afterEach(() => {
  dialog_queue.length = 0 // module-level queue outlives a test
})

// Promises resolve on a microtask, so a bare `await` is enough to see a settled one.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const yes_no: DialogChoice<`yes` | `no`>[] = [
  { id: `no`, label: `No` },
  { id: `yes`, label: `Yes`, tone: `accent` },
]

test(`request_choice queues a request and resolves it with the answer`, async () => {
  const answer = track(request_choice(`Overwrite?`, `Confirm`, yes_no, `no`))

  expect(dialog_queue).toHaveLength(1)
  expect(dialog_queue[0]).toMatchObject({
    title: `Confirm`,
    message: `Overwrite?`,
    dismiss_id: `no`,
    choices: yes_no,
  })
  await flush()
  expect(answer.settled).toBe(false) // nothing resolves until someone answers

  answer_dialog(`yes`)
  await flush()
  expect([answer.settled, answer.value]).toEqual([true, `yes`])
  expect(dialog_queue).toHaveLength(0)
})

// The whole point of the queue: one answer belongs to exactly one question.
test(`a single answer resolves only the request it was given for`, async () => {
  const first = track(request_choice(`First?`, `One`, yes_no, `no`))
  const second = track(request_choice(`Second?`, `Two`, yes_no, `no`))
  expect(dialog_queue.map((request) => request.title)).toEqual([`One`, `Two`])

  answer_dialog(`yes`)
  await flush()
  expect([first.settled, first.value]).toEqual([true, `yes`])
  expect(second.settled).toBe(false)
  expect(dialog_queue.map((request) => request.title)).toEqual([`Two`])

  answer_dialog(`no`)
  await flush()
  expect([second.settled, second.value]).toEqual([true, `no`])
})

test(`answering an empty queue resolves nothing and does not throw`, async () => {
  expect(() => answer_dialog(`yes`)).not.toThrow()

  // a stray answer must not be spent on the request that arrives next
  const answer = track(request_choice(`Late?`, `Late`, yes_no, `no`))
  await flush()
  expect(answer.settled).toBe(false)
  expect(dialog_queue).toHaveLength(1)
})

test.each([
  [`ok`, true],
  [`cancel`, false],
] as const)(`ask_confirm maps %s to %s`, async (answer_id, expected) => {
  const confirmed = track(ask_confirm(`Delete it?`, `Careful`, `Delete`))
  await flush()

  expect(dialog_queue[0].dismiss_id).toBe(`cancel`) // Escape must never mean yes
  expect(dialog_queue[0].choices).toEqual([
    { id: `cancel`, label: `Cancel` },
    { id: `ok`, label: `Delete`, tone: `accent` },
  ])

  answer_dialog(answer_id)
  await flush()
  expect([confirmed.settled, confirmed.value]).toEqual([true, expected])
})

test(`choices are arbitrary in number, not just ok/cancel`, async () => {
  const choices: DialogChoice<`discard` | `save` | `cancel`>[] = [
    { id: `cancel`, label: `Cancel` },
    { id: `discard`, label: `Discard` },
    { id: `save`, label: `Save`, tone: `accent` },
  ]
  const answer = track(request_choice(`Unsaved work`, `Quit`, choices, `cancel`))

  expect(dialog_queue[0].choices).toHaveLength(3)
  answer_dialog(`discard`)
  await flush()
  expect(answer.value).toBe(`discard`)
})
