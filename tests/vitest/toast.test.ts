import Toast from '$lib/Toast.svelte'
import {
  activate_toast_action,
  create_toast_queue,
  DEFAULT_TOAST_DURATION_MS,
  dismiss_toast,
  enqueue_toast,
  expire_toasts,
  type ToastCloseHandler,
  type ToastItem,
  type ToastLifecycleEffect,
  type ToastQueue,
  type ToastRequest,
  ToastStore,
} from '$lib/toast-queue.svelte.ts'
import { createRawSnippet, mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

const undo = { label: `Undo` }

// Insertion helper: every reducer case builds its queue by enqueueing at a known clock
const add = (
  queue: ToastQueue,
  message: string,
  request: Partial<ToastRequest> = {},
  now_ms = 0,
) => enqueue_toast(queue, { message, ...request }, now_ms)

const messages = (toasts: readonly ToastItem[]) => toasts.map((toast) => toast.message)

const fake_clock = () => {
  vi.useFakeTimers()
  vi.setSystemTime(0)
}

describe(`toast queue reducer`, () => {
  test(`promotes the first toast and queues the rest in insertion order`, () => {
    let queue = create_toast_queue()
    for (const message of [`a`, `b`, `c`]) queue = add(queue, message).queue

    expect(queue.active?.message).toBe(`a`)
    expect(messages(queue.pending)).toEqual([`b`, `c`])
    expect(queue.active?.seq).toBe(1)
  })

  test.each([
    [`error`, true],
    [`warning`, true],
    [`info`, false],
    [`progress`, false],
  ] as const)(`a %s arrival preempts an active info toast: %s`, (priority, preempts) => {
    const first = add(create_toast_queue(), `first`).queue
    const { queue } = add(first, `second`, { priority })

    expect(queue.active?.message).toBe(preempts ? `second` : `first`)
    expect(messages(queue.pending)).toEqual([preempts ? `first` : `second`])
  })

  test(`a demoted toast keeps its unspent visibility budget`, () => {
    // `a` is seen for 200 ms of its 1000 ms budget before `b` interrupts it, so it must
    // come back with 800 ms left rather than a fresh 1000 or the 800 it never spends
    const first = add(create_toast_queue(), `a`, { visible_duration_ms: 1000 }).queue
    expect(first.active?.expires_at_ms).toBe(1000)

    const interrupted = add(
      first,
      `b`,
      { priority: `error`, visible_duration_ms: 500 },
      200,
    ).queue
    expect(interrupted.active?.message).toBe(`b`)
    expect(interrupted.active?.expires_at_ms).toBe(700)
    // paused: no deadline runs while the toast is off screen
    expect(interrupted.pending[0].expires_at_ms).toBeNull()
    expect(interrupted.pending[0].visible_duration_ms).toBe(800)

    const resumed = expire_toasts(interrupted, 700)
    expect(resumed.effects).toEqual([{ reason: `timeout`, toast: interrupted.active }])
    expect(resumed.queue.active?.message).toBe(`a`)
    expect(resumed.queue.active?.expires_at_ms).toBe(1500) // 700 + the banked 800
  })

  test(`an absolute deadline keeps running while the toast waits`, () => {
    const first = add(create_toast_queue(), `a`, { expires_at_ms: 1000 }).queue
    const { queue } = add(first, `b`, { priority: `error` }, 200)

    // no visible_duration_ms, so nothing to bank — the wall clock is the whole contract
    expect(queue.pending[0].expires_at_ms).toBe(1000)
    expect(expire_toasts(queue, 1000).queue.pending).toEqual([])
  })

  test(`a toast that never became visible cannot expire while it waits`, () => {
    // both clocks at once: the visibility budget wins, so the deadline is banked rather
    // than left running on a toast nobody has seen yet
    const first = add(create_toast_queue(), `a`).queue
    const { queue } = add(first, `b`, {
      expires_at_ms: 500,
      visible_duration_ms: 300,
    })

    expect(queue.pending[0].expires_at_ms).toBeNull()
    expect(expire_toasts(queue, 500).queue.pending).toEqual(queue.pending)
  })

  describe(`overflow`, () => {
    // 1 active + 4 pending with max_pending 3, so exactly one toast has to go
    const overflow_case = (has_action: readonly boolean[]) => {
      let queue = create_toast_queue()
      let effects: readonly ToastLifecycleEffect[] = []
      queue = add(queue, `active`).queue
      for (const [idx, action] of has_action.entries()) {
        const transition = add(queue, `p${idx}`, action ? { action: undo } : {})
        queue = transition.queue
        effects = transition.effects
      }
      return { queue, effects }
    }

    test.each([
      // [description, pending actions, dropped, kept]
      [
        `drops the newest when none carry an action`,
        [false, false, false, false],
        [`p3`],
        [`p0`, `p1`, `p2`],
      ],
      [
        `skips past actions to the newest plain notice`,
        [false, true, true, false],
        [`p3`],
        [`p0`, `p1`, `p2`],
      ],
      [
        `drops the only actionless toast, wherever it sits`,
        [false, true, true, true],
        [`p0`],
        [`p1`, `p2`, `p3`],
      ],
      [
        `overflows nothing when every pending toast has an action`,
        [true, true, true, true],
        [],
        [`p0`, `p1`, `p2`, `p3`],
      ],
    ] as const)(`%s`, (_desc, has_action, dropped, kept) => {
      const { queue, effects } = overflow_case(has_action)

      expect(effects.map((effect) => effect.toast.message)).toEqual(dropped)
      expect(effects.every((effect) => effect.reason === `overflow`)).toBe(true)
      expect(messages(queue.pending)).toEqual(kept)
    })

    test(`max_pending is per queue`, () => {
      let queue = create_toast_queue(1)
      for (const message of [`a`, `b`, `c`]) queue = add(queue, message).queue

      expect(queue.active?.message).toBe(`a`)
      expect(messages(queue.pending)).toEqual([`b`])
    })
  })

  describe(`dedupe`, () => {
    test(`a repeat updates in place instead of queueing behind itself`, () => {
      const first = add(create_toast_queue(), `saving`).queue
      const repeat = add(first, `saving`)

      expect(repeat.deduplicated).toBe(true)
      expect(repeat.toast_id).toBe(first.active?.id)
      expect(repeat.queue.pending).toEqual([])
    })

    test(`a lower-priority repeat refreshes the text only`, () => {
      const first = add(create_toast_queue(), `first text`, {
        priority: `error`,
        dedupe_key: `job`,
        action: undo,
      }).queue
      const { queue } = add(first, `second text`, {
        priority: `info`,
        dedupe_key: `job`,
      })

      expect(queue.active?.message).toBe(`second text`)
      expect(queue.active?.priority).toBe(`error`)
      expect(queue.active?.action).toEqual(undo)
    })

    test(`a higher-priority repeat takes over priority, timing and action`, () => {
      const first = add(create_toast_queue(), `first text`, { dedupe_key: `job` }).queue
      const { queue } = add(
        first,
        `second text`,
        { priority: `error`, dedupe_key: `job`, action: undo, visible_duration_ms: 900 },
        100,
      )

      expect(queue.active?.priority).toBe(`error`)
      expect(queue.active?.action).toEqual(undo)
      expect(queue.active?.expires_at_ms).toBe(1000) // restarted at the new priority
    })

    test(`a repeat that arrives already expired times out rather than lingering`, () => {
      const first = add(create_toast_queue(), `a`, { dedupe_key: `job` }).queue
      const { queue, effects } = add(
        first,
        `a`,
        { dedupe_key: `job`, expires_at_ms: 50 },
        100,
      )

      expect(queue.active).toBeNull()
      expect(effects.map((effect) => effect.reason)).toEqual([`timeout`])
    })
  })

  test(`an already-expired request never reaches the queue`, () => {
    const { queue, effects } = add(create_toast_queue(), `stale`, {
      expires_at_ms: -1,
    })

    expect(queue.active).toBeNull()
    expect(effects.map((effect) => effect.reason)).toEqual([`timeout`])
    expect(queue.next_id).toBe(2) // the id is still spent, so seq stays monotonic
  })

  test(`dismissing an unknown id changes nothing`, () => {
    const queue = add(create_toast_queue(), `a`).queue
    const transition = dismiss_toast(queue, `toast-404`, 0)

    expect(transition.queue).toEqual(queue)
    expect(transition.effects).toEqual([])
  })

  test(`activating an action removes the toast and reports it first`, () => {
    let queue = add(create_toast_queue(), `a`, { action: undo }).queue
    queue = add(queue, `b`).queue
    const transition = activate_toast_action(queue, `toast-1`, 0)

    expect(transition.effects.map((effect) => effect.reason)).toEqual([`action`])
    expect(transition.effects[0].toast.message).toBe(`a`)
    expect(transition.queue.active?.message).toBe(`b`)
  })

  test(`activating a toast with no action is a no-op`, () => {
    const queue = add(create_toast_queue(), `a`).queue
    const transition = activate_toast_action(queue, `toast-1`, 0)

    expect(transition.effects).toEqual([])
    expect(transition.queue.active?.message).toBe(`a`)
  })
})

describe(`ToastStore`, () => {
  afterEach(() => void vi.useRealTimers())

  test(`show returns an id and exposes active, pending and items`, () => {
    const store = new ToastStore()
    const first_id = store.show(`a`)
    store.show(`b`)

    expect(store.active?.id).toBe(first_id)
    expect(messages(store.pending)).toEqual([`b`])
    expect(messages(store.items)).toEqual([`a`, `b`])

    store.dismiss(first_id)
    expect(store.active?.message).toBe(`b`)
  })

  test(`a plain toast times out on its own, a sticky one does not`, () => {
    fake_clock()
    const store = new ToastStore()
    store.show(`sticky`, { priority: `error` })
    store.show(`fleeting`)

    expect(store.active?.message).toBe(`sticky`)
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS * 3)
    expect(messages(store.items)).toEqual([`sticky`, `fleeting`]) // neither clock ran

    store.dismiss(`toast-1`)
    expect(store.active?.message).toBe(`fleeting`)
    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS - 1)
    expect(store.active?.message).toBe(`fleeting`)
    vi.advanceTimersByTime(1)
    expect(store.active).toBeNull()
  })

  test(`pause banks the remainder and resume spends exactly that`, () => {
    fake_clock()
    const store = new ToastStore()
    store.show(`a`, { duration_ms: 1000 })

    vi.advanceTimersByTime(300)
    store.pause()
    vi.advanceTimersByTime(10_000)
    expect(store.active?.message).toBe(`a`) // paused toasts outlive their duration

    store.resume()
    vi.advanceTimersByTime(699)
    expect(store.active?.message).toBe(`a`)
    vi.advanceTimersByTime(1)
    expect(store.active).toBeNull()
  })

  test(`resume on a running toast does not extend it`, () => {
    fake_clock()
    const store = new ToastStore()
    store.show(`a`, { duration_ms: 1000 })

    vi.advanceTimersByTime(300)
    store.resume()
    vi.advanceTimersByTime(700)
    expect(store.active).toBeNull()
  })

  test.each([
    [`dismiss`, (store: ToastStore) => store.dismiss(`toast-1`)],
    [`action`, (store: ToastStore) => store.run_action(`toast-1`)],
    [`timeout`, () => vi.advanceTimersByTime(DEFAULT_TOAST_DURATION_MS)],
  ] as const)(`on_close reports reason=%s`, (reason, act) => {
    fake_clock()
    const store = new ToastStore()
    const on_close = vi.fn<ToastCloseHandler>()
    const on_click = vi.fn()
    store.show(`a`, { on_close, action: { label: `Undo`, on_click } })

    act(store)

    expect(on_close).toHaveBeenCalledOnce()
    expect(on_close.mock.calls[0][1]).toBe(reason)
    expect(on_click).toHaveBeenCalledTimes(reason === `action` ? 1 : 0)
  })

  test(`an overflowed toast reports on_close too`, () => {
    const store = new ToastStore({ max_pending: 1 })
    const on_close = vi.fn<ToastCloseHandler>()
    store.show(`active`)
    store.show(`kept`)
    store.show(`dropped`, { on_close })

    expect(on_close.mock.calls[0][1]).toBe(`overflow`)
    expect(messages(store.items)).toEqual([`active`, `kept`])
  })

  test(`clear takes a predicate and defaults to everything`, () => {
    const store = new ToastStore()
    store.show(`keep`, { priority: `error` })
    store.show(`drop`)

    store.clear((toast) => toast.priority === `info`)
    expect(messages(store.items)).toEqual([`keep`])

    store.clear()
    expect(store.items).toEqual([])
  })

  test(`destroy drops the queue and its pending timer`, () => {
    fake_clock()
    const store = new ToastStore()
    store.show(`a`)
    store.destroy()

    expect(store.items).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe(`<Toast />`, () => {
  const mounted: Record<string, unknown>[] = []
  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
    vi.useRealTimers()
  })

  const render = (props: Record<string, unknown> = {}) => {
    const store = (props.store as ToastStore | undefined) ?? new ToastStore()
    mounted.push(mount(Toast, { target: document.body, props: { ...props, store } }))
    return store
  }
  const polite = () => doc_query(`[aria-live="polite"]`)
  const assertive = () => doc_query(`[aria-live="assertive"]`)

  test(`both live regions are mounted before any toast exists`, () => {
    render()

    // a region created together with its first message goes unannounced in several
    // screen readers, so neither may be conditional on there being a toast
    expect(polite().getAttribute(`role`)).toBe(`status`)
    expect(assertive().getAttribute(`role`)).toBe(`alert`)
    expect(polite().textContent?.trim()).toBe(``)
    expect(document.querySelector(`.toast`)).toBeNull()
  })

  test.each([
    [`info`, `polite`],
    [`progress`, `polite`],
    [`success`, `polite`],
    [`warning`, `assertive`],
    [`error`, `assertive`],
  ] as const)(`a %s toast renders into the %s region`, async (priority, region) => {
    const store = render()
    store.show(`hello`, { priority })
    await tick()

    const [used, empty] =
      region === `polite` ? [polite(), assertive()] : [assertive(), polite()]
    expect(used.textContent).toContain(`hello`)
    expect(empty.textContent?.trim()).toBe(``)
    expect(doc_query(`.toast`).dataset.priority).toBe(priority)
    // the whole toast is read, not just the changed word
    expect(used.getAttribute(`aria-atomic`)).toBe(`true`)
  })

  test(`the waiting count is rendered with a spelled-out label`, async () => {
    const store = render()
    store.show(`a`)
    store.show(`b`)
    await tick()

    expect(doc_query(`.toast-pending`).getAttribute(`aria-label`)).toBe(
      `1 more notification pending`,
    )
    store.show(`c`)
    await tick()
    expect(doc_query(`.toast-pending`).getAttribute(`aria-label`)).toBe(
      `2 more notifications pending`,
    )
  })

  test(`the action button runs the action and closes the toast`, async () => {
    const store = render()
    const on_click = vi.fn()
    store.show(`deleted`, { action: { label: `Undo`, on_click } })
    await tick()

    const button = doc_query<HTMLButtonElement>(`.toast-action`)
    expect(button.textContent?.trim()).toBe(`Undo`)
    button.click()
    await tick()

    expect(on_click).toHaveBeenCalledOnce()
    expect(store.active).toBeNull()
    expect(document.querySelector(`.toast`)).toBeNull()
  })

  test(`the dismiss button is labelled and removes the toast`, async () => {
    const store = render({ dismiss_label: `Close` })
    store.show(`a`)
    await tick()

    const button = doc_query<HTMLButtonElement>(`.toast-dismiss`)
    expect(button.getAttribute(`aria-label`)).toBe(`Close`)
    button.click()
    await tick()
    expect(store.active).toBeNull()
  })

  test(`dismissible={false} leaves no close button`, async () => {
    const store = render({ dismissible: false })
    store.show(`a`)
    await tick()

    expect(document.querySelector(`.toast-dismiss`)).toBeNull()
  })

  test(`a children snippet replaces the message markup`, async () => {
    const children = createRawSnippet<[ToastItem]>((item) => ({
      render: () => `<em class="custom">${item().message}!</em>`,
    }))
    const store = render({ children })
    store.show(`hi`)
    await tick()

    expect(doc_query(`.custom`).textContent).toBe(`hi!`)
    expect(document.querySelector(`.toast-message`)).toBeNull()
  })

  // the edge rules themselves live in CSS, keyed off this attribute, so that a consumer
  // can restyle placement without the component writing inline styles they can't beat
  test.each([`top-left`, `top-center`, `bottom-right`] as const)(
    `position=%s reaches the stylesheet as a data attribute`,
    (position) => {
      render({ position })
      expect(doc_query(`.toast-stack`).dataset.position).toBe(position)
    },
  )

  test(`consumer attributes survive alongside the component's own`, () => {
    render({ class: `mine`, id: `notifications` })

    const stack = doc_query(`.toast-stack`)
    expect(stack.id).toBe(`notifications`)
    expect(stack.classList.contains(`mine`)).toBe(true)
    expect(stack.classList.contains(`toast-stack`)).toBe(true)
  })

  test(`hovering the stack suspends the countdown`, async () => {
    fake_clock()
    const store = render()
    store.show(`a`, { duration_ms: 1000 })
    await tick()

    const stack = doc_query(`.toast-stack`)
    vi.advanceTimersByTime(400)
    stack.dispatchEvent(new PointerEvent(`pointerenter`))
    vi.advanceTimersByTime(5000)
    expect(store.active?.message).toBe(`a`)

    stack.dispatchEvent(new PointerEvent(`pointerleave`))
    vi.advanceTimersByTime(599)
    expect(store.active?.message).toBe(`a`) // 600 ms was left, not a fresh 1000
    vi.advanceTimersByTime(1)
    expect(store.active).toBeNull()
  })

  test(`a toast promoted under the pointer starts out paused`, async () => {
    fake_clock()
    const store = render()
    store.show(`first`, { duration_ms: 1000 })
    await tick()
    doc_query(`.toast-stack`).dispatchEvent(new PointerEvent(`pointerenter`))

    store.show(`urgent`, { priority: `error` })
    store.dismiss(`toast-2`) // back to `first`, promoted with the pointer never moving
    await tick()

    expect(store.active?.message).toBe(`first`)
    vi.advanceTimersByTime(5000)
    expect(store.active?.message).toBe(`first`)
  })

  test(`pause_on_hover={false} keeps the clock running under the pointer`, async () => {
    fake_clock()
    const store = render({ pause_on_hover: false })
    store.show(`a`, { duration_ms: 1000 })
    await tick()

    doc_query(`.toast-stack`).dispatchEvent(new PointerEvent(`pointerenter`))
    vi.advanceTimersByTime(1000)
    expect(store.active).toBeNull()
  })

  test(`focus into the toast suspends the countdown even without hover`, async () => {
    fake_clock()
    const store = render({ pause_on_hover: false })
    store.show(`a`, { duration_ms: 1000, action: { label: `Undo` } })
    await tick()

    doc_query(`.toast-stack`).dispatchEvent(new FocusEvent(`focusin`, { bubbles: true }))
    vi.advanceTimersByTime(5000)
    expect(store.active?.message).toBe(`a`)
  })

  test(`the focus hotkey moves the keyboard to the toast's first control`, async () => {
    const store = render()
    store.show(`a`, { action: { label: `Undo` } })
    await tick()

    document.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `t`, altKey: true, bubbles: true }),
    )
    expect(document.activeElement).toBe(doc_query(`.toast-action`))
  })

  test(`Escape dismisses only once the keyboard is inside the toast`, async () => {
    const store = render()
    store.show(`a`)
    await tick()

    const escape = () => new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true })
    document.body.dispatchEvent(escape())
    await tick()
    expect(store.active?.message).toBe(`a`)

    doc_query(`.toast-dismiss`).dispatchEvent(escape())
    await tick()
    expect(store.active).toBeNull()
  })
})
