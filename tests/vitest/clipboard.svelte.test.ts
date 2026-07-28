import { create_clipboard_feedback } from '$lib/clipboard.svelte'
import { flushSync } from 'svelte'
import { afterAll, afterEach, expect, test, vi } from 'vite-plus/test'

vi.stubGlobal(`navigator`, { clipboard: { writeText: () => Promise.resolve() } })
afterEach(() => vi.useRealTimers())
afterAll(() => vi.unstubAllGlobals())

test(`clear does not subscribe its calling effect to timer state`, async () => {
  vi.useFakeTimers()
  const { copy, clear } = create_clipboard_feedback(1000)
  await copy(`a`, `first`)

  let runs = 0
  const cleanup = $effect.root(() => {
    $effect(() => {
      runs++
      clear()
    })
  })
  flushSync()
  expect(runs).toBe(1)

  await copy(`b`, `second`)
  flushSync()
  expect(runs).toBe(1)

  cleanup()
  clear()
})
