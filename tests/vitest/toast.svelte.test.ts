// Separate from toast.test.ts because driving a prop after mount needs a $state props
// object, and runes are only available in .svelte.ts files. Deliberately holds this one
// case, so none of that file's mount/teardown scaffolding has to be repeated here.
import Toast from '$lib/Toast.svelte'
import { ToastStore } from '$lib/toast-queue.svelte.ts'
import { mount, tick, unmount } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

// `hovered` is recorded whatever pause_on_hover says, leaving the prop pure policy: it
// acts on the pointer already sitting there rather than waiting for a fresh enter.
test(`flipping pause_on_hover acts on an already-hovered stack`, async () => {
  vi.useFakeTimers()
  const store = new ToastStore()
  const props = $state({ store, pause_on_hover: false })
  const app = mount(Toast, { target: document.body, props })
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

  void unmount(app)
  vi.useRealTimers()
})
