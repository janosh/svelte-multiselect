// Toast notifications: a pure queue reducer plus the reactive store Toast.svelte reads.
// Only one toast is visible at a time; the rest wait their turn ranked by priority, so a
// burst of notices cannot bury the one that matters or scroll past before it is read.

export const TOAST_PRIORITIES = [
  `progress`,
  `info`,
  `success`,
  `warning`,
  `error`,
] as const

export type ToastPriority = (typeof TOAST_PRIORITIES)[number]
export type ToastLifecycleReason = `action` | `dismiss` | `overflow` | `timeout`
export type ToastPosition =
  | `top-left`
  | `top-center`
  | `top-right`
  | `bottom-left`
  | `bottom-center`
  | `bottom-right`

// Rank is array position: a later priority outranks an earlier one and preempts it.
const priority_rank = (priority: ToastPriority): number =>
  TOAST_PRIORITIES.indexOf(priority)

// Soft cap on waiting toasts. Soft because an unactioned action is never dropped.
export const DEFAULT_MAX_PENDING = 3
export const DEFAULT_TOAST_DURATION_MS = 5000
// A warning or error the user never saw is a bug report waiting to happen, so the top
// two ranks stay up until dismissed while the lower ones time out on their own.
export const STICKY_PRIORITIES: readonly ToastPriority[] = [`warning`, `error`]

export interface ToastAction {
  label: string
  on_click?: (toast: ToastItem) => void
}

export type ToastCloseHandler = (toast: ToastItem, reason: ToastLifecycleReason) => void

export interface ToastRequest {
  message: string
  priority?: ToastPriority
  // Absolute wall-clock deadline. Keeps counting down while the toast waits its turn,
  // for notices that go stale on their own schedule rather than after N seconds seen.
  expires_at_ms?: number | null
  // Budget spent only while this toast is the visible one. Pauses on demotion.
  visible_duration_ms?: number
  // Repeats of the same key update the existing toast instead of queueing behind it.
  // Defaults to the message, so identical text collapses without any bookkeeping.
  dedupe_key?: string
  action?: ToastAction
  on_close?: ToastCloseHandler
}

export interface ToastItem {
  id: string
  // Insertion order, breaking ties between toasts created in the same millisecond
  seq: number
  message: string
  priority: ToastPriority
  created_at_ms: number
  expires_at_ms: number | null
  visible_duration_ms?: number
  dedupe_key: string
  action?: ToastAction
  on_close?: ToastCloseHandler
}

export interface ToastQueue {
  active: ToastItem | null
  pending: readonly ToastItem[]
  next_id: number
  max_pending: number
}

export interface ToastLifecycleEffect {
  reason: ToastLifecycleReason
  toast: ToastItem
}

export interface ToastQueueTransition {
  queue: ToastQueue
  effects: readonly ToastLifecycleEffect[]
}

export interface EnqueueToastTransition extends ToastQueueTransition {
  toast_id: string
  deduplicated: boolean
}

const compare_toasts = (left: ToastItem, right: ToastItem): number =>
  priority_rank(right.priority) - priority_rank(left.priority) ||
  left.created_at_ms - right.created_at_ms ||
  left.seq - right.seq

const is_expired = (toast: ToastItem, now_ms: number): boolean =>
  toast.expires_at_ms !== null && toast.expires_at_ms <= now_ms

// Bank the unspent part of a visibility budget. A toast pushed back into the queue has
// not been read, so its clock stops until it is on screen again.
export const pause_visibility_timeout = (toast: ToastItem, now_ms: number): ToastItem =>
  toast.visible_duration_ms === undefined
    ? toast
    : {
        ...toast,
        expires_at_ms: null,
        visible_duration_ms:
          toast.expires_at_ms === null
            ? toast.visible_duration_ms
            : Math.max(0, toast.expires_at_ms - now_ms),
      }

export const start_visibility_timeout = (toast: ToastItem, now_ms: number): ToastItem =>
  toast.visible_duration_ms === undefined
    ? toast
    : { ...toast, expires_at_ms: now_ms + toast.visible_duration_ms }

const rebalance_queue = (queue: ToastQueue, now_ms: number): ToastQueueTransition => {
  let { active } = queue
  const pending = queue.pending.map((toast) => pause_visibility_timeout(toast, now_ms))
  pending.sort(compare_toasts)
  if (!active) {
    const promoted = pending.shift()
    active = promoted ? start_visibility_timeout(promoted, now_ms) : null
  } else if (
    pending[0] &&
    priority_rank(pending[0].priority) > priority_rank(active.priority)
  ) {
    const [next_up] = pending.splice(0, 1)
    pending.push(pause_visibility_timeout(active, now_ms))
    pending.sort(compare_toasts)
    active = start_visibility_timeout(next_up, now_ms)
  }

  const overflow: ToastItem[] = []
  while (pending.length > queue.max_pending) {
    // An unseen action must remain available even if actions temporarily push
    // the queue above the soft cap; only non-destructive notices may overflow.
    const overflow_idx = pending.findLastIndex((toast) => !toast.action)
    if (overflow_idx === -1) break
    overflow.push(...pending.splice(overflow_idx, 1))
  }
  return {
    queue: { ...queue, active, pending },
    effects: overflow.map((toast) => ({ reason: `overflow`, toast })),
  }
}

const remove_toast = (
  queue: ToastQueue,
  toast_id: string,
  now_ms: number,
): [ToastQueue, ToastItem | null] => {
  const { active } = queue
  if (active?.id === toast_id) {
    return [rebalance_queue({ ...queue, active: null }, now_ms).queue, active]
  }
  const pending_idx = queue.pending.findIndex((toast) => toast.id === toast_id)
  if (pending_idx === -1) return [queue, null]
  const pending = [...queue.pending]
  const [toast] = pending.splice(pending_idx, 1)
  return [{ ...queue, pending }, toast]
}

export const create_toast_queue = (
  max_pending: number = DEFAULT_MAX_PENDING,
): ToastQueue => ({ active: null, pending: [], next_id: 1, max_pending })

export const expire_toasts = (
  queue: ToastQueue,
  now_ms: number,
): ToastQueueTransition => {
  const expired = [queue.active, ...queue.pending].filter(
    (toast): toast is ToastItem => toast !== null && is_expired(toast, now_ms),
  )
  if (expired.length === 0) return { queue, effects: [] }

  const active = queue.active && !is_expired(queue.active, now_ms) ? queue.active : null
  const pending = queue.pending.filter((toast) => !is_expired(toast, now_ms))
  return {
    queue: rebalance_queue({ ...queue, active, pending }, now_ms).queue,
    effects: expired.map((toast) => ({ reason: `timeout`, toast })),
  }
}

export const enqueue_toast = (
  queue: ToastQueue,
  request: ToastRequest,
  now_ms: number,
): EnqueueToastTransition => {
  const expired_transition = expire_toasts(queue, now_ms)
  queue = expired_transition.queue
  const effects = [...expired_transition.effects]
  const priority = request.priority ?? `info`
  const expires_at_ms = request.expires_at_ms ?? null
  const dedupe_key = request.dedupe_key ?? request.message
  const existing = [queue.active, ...queue.pending].find(
    (toast) => toast?.dedupe_key === dedupe_key,
  )

  if (existing) {
    const request_is_lower_priority =
      priority_rank(priority) < priority_rank(existing.priority)

    // A lower-priority repeat only refreshes the text; the higher-priority
    // original keeps its priority, timing, and action.
    const updated: ToastItem = request_is_lower_priority
      ? { ...existing, message: request.message }
      : {
          ...existing,
          message: request.message,
          priority,
          expires_at_ms,
          action: request.action,
          visible_duration_ms: request.visible_duration_ms,
          on_close: request.on_close,
        }
    let transition: ToastQueueTransition
    if (is_expired(updated, now_ms)) {
      const [without_existing] = remove_toast(queue, existing.id, now_ms)
      transition = {
        queue: without_existing,
        effects: [{ reason: `timeout`, toast: updated }],
      }
    } else if (queue.active?.id === existing.id) {
      const active = request_is_lower_priority
        ? updated
        : start_visibility_timeout(updated, now_ms)
      transition = { queue: { ...queue, active }, effects: [] }
    } else {
      const pending = queue.pending.map((toast) =>
        toast.id === existing.id ? updated : toast,
      )
      transition = rebalance_queue({ ...queue, pending }, now_ms)
    }
    return {
      queue: transition.queue,
      effects: [...effects, ...transition.effects],
      toast_id: existing.id,
      deduplicated: true,
    }
  }

  const toast: ToastItem = {
    id: `toast-${queue.next_id}`,
    seq: queue.next_id,
    message: request.message,
    priority,
    created_at_ms: now_ms,
    expires_at_ms,
    visible_duration_ms: request.visible_duration_ms,
    dedupe_key,
    action: request.action,
    on_close: request.on_close,
  }
  const next_id = queue.next_id + 1
  const transition: ToastQueueTransition = is_expired(toast, now_ms)
    ? { queue: { ...queue, next_id }, effects: [{ reason: `timeout`, toast }] }
    : rebalance_queue({ ...queue, next_id, pending: [...queue.pending, toast] }, now_ms)
  return {
    queue: transition.queue,
    effects: [...effects, ...transition.effects],
    toast_id: toast.id,
    deduplicated: false,
  }
}

export const dismiss_toast = (
  queue: ToastQueue,
  toast_id: string,
  now_ms: number,
): ToastQueueTransition => {
  const expired_transition = expire_toasts(queue, now_ms)
  const [next_queue, dismissed] = remove_toast(expired_transition.queue, toast_id, now_ms)
  return {
    queue: next_queue,
    effects: dismissed
      ? [...expired_transition.effects, { reason: `dismiss`, toast: dismissed }]
      : expired_transition.effects,
  }
}

export const activate_toast_action = (
  queue: ToastQueue,
  toast_id: string,
  now_ms: number,
): ToastQueueTransition => {
  // A click already dispatched by the browser wins over a delayed expiry
  // timer. Remove the target first, then expire unrelated queue items.
  const toast =
    queue.active?.id === toast_id
      ? queue.active
      : queue.pending.find((item) => item.id === toast_id)
  if (!toast?.action) return expire_toasts(queue, now_ms)
  const [without_target] = remove_toast(queue, toast_id, now_ms)
  const expired_transition = expire_toasts(without_target, now_ms)
  return {
    queue: expired_transition.queue,
    effects: [{ reason: `action`, toast }, ...expired_transition.effects],
  }
}

// === Reactive store ===

export type ToastOptions = Omit<ToastRequest, `message` | `visible_duration_ms`> & {
  // Counts only while the toast is on screen, so a hover or a higher-priority
  // interruption does not eat the reading time. `null` stays up until dismissed.
  duration_ms?: number | null
}

export interface ToastStoreOptions {
  max_pending?: number
  duration_ms?: number
}

export class ToastStore {
  #queue: ToastQueue = $state.raw(create_toast_queue())
  #timer: ReturnType<typeof setTimeout> | undefined
  readonly #default_duration_ms: number

  constructor(options: ToastStoreOptions = {}) {
    this.#queue = create_toast_queue(options.max_pending)
    this.#default_duration_ms = options.duration_ms ?? DEFAULT_TOAST_DURATION_MS
  }

  get active(): ToastItem | null {
    return this.#queue.active
  }
  get pending(): readonly ToastItem[] {
    return this.#queue.pending
  }
  // Everything the queue is holding, visible one first
  get items(): readonly ToastItem[] {
    const { active, pending } = this.#queue
    return active ? [active, ...pending] : pending
  }

  show(message: string, options: ToastOptions = {}): string {
    const { duration_ms, priority = `info`, ...request } = options
    const default_duration_ms = STICKY_PRIORITIES.includes(priority)
      ? null
      : this.#default_duration_ms
    // `null` is a deliberate "stays until dismissed", so ?? would read it as absent
    const resolved_duration_ms =
      duration_ms === undefined ? default_duration_ms : duration_ms
    const transition = enqueue_toast(
      this.#queue,
      {
        ...request,
        message,
        priority,
        ...(resolved_duration_ms !== null && {
          visible_duration_ms: resolved_duration_ms,
        }),
      },
      Date.now(),
    )
    this.#apply(transition)
    return transition.toast_id
  }

  dismiss(toast_id: string): void {
    this.#apply(dismiss_toast(this.#queue, toast_id, Date.now()))
  }

  run_action(toast_id: string): void {
    this.#apply(activate_toast_action(this.#queue, toast_id, Date.now()))
  }

  // Dismisses everything matching, defaulting to the whole queue
  clear(predicate: (toast: ToastItem) => boolean = () => true): void {
    const now_ms = Date.now()
    let queue = this.#queue
    const effects: ToastLifecycleEffect[] = []
    for (const { id } of this.items.filter(predicate)) {
      const transition = dismiss_toast(queue, id, now_ms)
      queue = transition.queue
      effects.push(...transition.effects)
    }
    this.#apply({ queue, effects })
  }

  // WCAG 2.2.1: an auto-dismissing message must stop counting down while the user is
  // reading it or reaching for its button. Only the visible toast has a running clock.
  pause(): void {
    const { active } = this.#queue
    // a null deadline means already paused, or never counting in the first place
    if (!active || active.expires_at_ms === null) return
    const paused = pause_visibility_timeout(active, Date.now())
    if (paused === active) return // an absolute deadline has no budget to bank
    this.#apply({ queue: { ...this.#queue, active: paused }, effects: [] })
  }

  resume(): void {
    const { active } = this.#queue
    // Nothing to resume unless a toast is actually paused: resuming a running one
    // would hand it a second full duration rather than the remainder it had left.
    if (active?.expires_at_ms !== null) return
    const resumed = start_visibility_timeout(active, Date.now())
    if (resumed === active) return
    this.#apply({ queue: { ...this.#queue, active: resumed }, effects: [] })
  }

  // Drops the pending timer and every toast, for teardown between tests or routes
  destroy(): void {
    clearTimeout(this.#timer)
    this.#queue = create_toast_queue(this.#queue.max_pending)
  }

  #apply(transition: ToastQueueTransition): void {
    this.#queue = transition.queue
    this.#schedule()
    // Dispatched after the queue is committed so a handler that enqueues a follow-up
    // toast sees the state its own toast left behind.
    for (const { toast, reason } of transition.effects) {
      if (reason === `action`) toast.action?.on_click?.(toast)
      toast.on_close?.(toast, reason)
    }
  }

  #schedule(): void {
    clearTimeout(this.#timer)
    const deadlines = this.items
      .map((toast) => toast.expires_at_ms)
      .filter((deadline) => typeof deadline === `number`)
    if (deadlines.length === 0) return
    const delay_ms = Math.max(0, Math.min(...deadlines) - Date.now())
    this.#timer = setTimeout(
      () => this.#apply(expire_toasts(this.#queue, Date.now())),
      delay_ms,
    )
  }
}

// Default store, so `toast.show(...)` works from anywhere without threading an instance
// through props. Pass your own to <Toast store={...} /> when a page needs its own queue.
export const toast = new ToastStore()
