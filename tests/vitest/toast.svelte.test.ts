// Separate because mutating props after mount requires runes in a .svelte.ts test.
import Toast from '$lib/Toast.svelte'
import { ToastStore } from '$lib/toast-queue.svelte.ts'
import { mount, tick, unmount } from 'svelte'
import { afterEach, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

let app: Record<string, unknown> | undefined
afterEach(() => {
  if (app) void unmount(app)
  app = undefined
  vi.useRealTimers()
})

test(`flipping pause_on_hover acts on an already-hovered stack`, async () => {
  vi.useFakeTimers()
  const store = new ToastStore()
  const props = $state({ store, pause_on_hover: false })
  app = mount(Toast, { target: document.body, props })
  store.show(`a`, { duration_ms: 1000 })
  await tick()
  vi.advanceTimersByTime(400)
  doc_query(`.toast-stack`).dispatchEvent(new PointerEvent(`pointerenter`))

  props.pause_on_hover = true
  await tick()
  vi.advanceTimersByTime(5000)
  expect(store.active?.message).toBe(`a`) // paused without the pointer re-entering

  props.pause_on_hover = false
  await tick()
  vi.advanceTimersByTime(599)
  expect(store.active?.message).toBe(`a`) // 600 ms was banked at the flip, not a fresh 1000
  vi.advanceTimersByTime(1)
  expect(store.active).toBeNull()
})
