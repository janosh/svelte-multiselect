import type { ComponentProps } from 'svelte'
import { mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import type Popover from '$lib/Popover.svelte'
import { doc_query, pointer_event } from './index'
import TestPopover from './TestPopover.svelte'

describe(`Popover`, () => {
  type PopoverProps = Omit<ComponentProps<typeof Popover>, `children`>
  // click_outside and focus_trap register document listeners that outlive
  // document.body.innerHTML = '', so unmount for real between cases
  const mounted: Record<string, unknown>[] = []
  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
    vi.useRealTimers()
  })
  const mount_popover = (extra: Partial<PopoverProps> = {}) => {
    const props = $state({ ...extra })
    mounted.push(mount(TestPopover, { target: document.body, props }))
    return props
  }
  const trigger = () => doc_query<HTMLButtonElement>(`[data-testid="popover-trigger"]`)
  const surface = () => document.querySelector(`[role="dialog"]`)
  // pointer_event sets isPrimary; a bare PointerEvent reads as a second finger
  const press = (target: EventTarget) =>
    target.dispatchEvent(pointer_event(`pointerdown`, 0, 0))
  const advance_time = async (milliseconds: number) => {
    await vi.advanceTimersByTimeAsync(milliseconds)
    await tick()
  }

  test(`trigger opens the surface and wires the aria attributes`, async () => {
    mount_popover()
    expect(surface()).toBeNull()
    expect(trigger().getAttribute(`aria-expanded`)).toBe(`false`)

    trigger().click()
    await tick()

    expect(trigger().getAttribute(`aria-expanded`)).toBe(`true`)
    expect(surface()?.id).toBe(trigger().getAttribute(`aria-controls`))
    // focus_trap moved the keyboard into the surface
    expect(document.activeElement).toBe(doc_query(`[data-testid="popover-item"]`))
  })

  // both live after the {...rest} spread, so a consumer prop cannot clobber the aria
  // linkage or drop the .popover class every bit of the styling hangs off
  test(`keeps its own id and class alongside a consumer's`, async () => {
    mount_popover({ id: `consumer-id`, class: `consumer-class` })
    trigger().click()
    await tick()

    const dialog = doc_query(`[role="dialog"]`)
    expect(dialog.id).toBe(trigger().getAttribute(`aria-controls`))
    // svelte adds its own scoping hash, so check membership not the whole list
    expect(dialog.classList.contains(`popover`)).toBe(true)
    expect(dialog.classList.contains(`consumer-class`)).toBe(true)
  })

  // The wrapper around the trigger snippet is `display: contents` and measures 0x0,
  // so anchoring to it would pin every popover to the viewport corner
  test(`positions against the trigger, not the wrapper around it`, async () => {
    mount_popover({ offset: 8 })
    const rect = { top: 20, bottom: 50, left: 100, right: 200, width: 100, height: 30 }
    trigger().getBoundingClientRect = vi.fn(() => rect as DOMRect)

    trigger().click()
    await tick()

    expect(doc_query(`[role="dialog"]`).style.top).toBe(`58px`) // 50 + 8
  })

  test.each([
    [`a press outside`, `pointer`, () => press(document.body)],
    [
      `Escape`,
      `escape`,
      () =>
        document.dispatchEvent(
          new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }),
        ),
    ],
  ] as const)(`%s closes it, reporting via=%s`, async (_desc, via, dismiss) => {
    const on_close = vi.fn()
    mount_popover({ on_close })
    trigger().click()
    await tick()

    dismiss()
    await tick()

    expect(surface()).toBeNull()
    expect(on_close).toHaveBeenCalledWith({ via })
    // the trap handed the keyboard back to where it came from
    expect(document.activeElement).toBe(trigger())
  })

  test(`presses inside leave it open, so the trigger click can close it`, async () => {
    const on_close = vi.fn()
    mount_popover({ on_close })
    trigger().click()
    await tick()

    // the trigger sits in click_outside's inside list and the item is in the surface,
    // so neither press dismisses and only the click that follows acts
    press(trigger())
    press(doc_query(`[data-testid="popover-item"]`))
    await tick()
    expect(surface()).not.toBeNull()
    expect(on_close).not.toHaveBeenCalled()

    trigger().click()
    await tick()
    expect(surface()).toBeNull()
    expect(on_close).toHaveBeenCalledWith({ via: `trigger` })
  })

  // Dismissal waits for the click, so a gesture behind the popover — a pan, a drag — keeps
  // it visible until the release instead of having it vanish underneath
  test(`dismiss_on: 'release' waits for the click`, async () => {
    const on_close = vi.fn()
    mount_popover({ dismiss_on: `release`, on_close })
    trigger().click()
    await tick()

    press(document.body)
    await tick()
    expect(surface()).not.toBeNull()
    expect(on_close).not.toHaveBeenCalled()

    document.body.dispatchEvent(new PointerEvent(`click`, { bubbles: true }))
    await tick()
    expect(surface()).toBeNull()
    expect(on_close).toHaveBeenCalledWith({ via: `pointer` })
  })

  // a drag off the surface reports its click on a common ancestor, not an outside click
  test(`dismiss_on: 'release' keeps a gesture that started inside`, async () => {
    const on_close = vi.fn()
    mount_popover({ dismiss_on: `release`, on_close })
    trigger().click()
    await tick()
    press(doc_query(`[role="dialog"]`))
    document.body.dispatchEvent(pointer_event(`click`, 0, 0, { detail: 1 }))
    await tick()

    expect(surface()).not.toBeNull()
    expect(on_close).not.toHaveBeenCalled()
  })

  test(`escape: false leaves Escape to the consumer`, async () => {
    mount_popover({ escape: false })
    trigger().click()
    await tick()

    document.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
    await tick()
    expect(surface()).not.toBeNull()
  })

  test(`trap_focus: false leaves focus where it was`, async () => {
    mount_popover({ trap_focus: false })
    trigger().focus()
    trigger().click()
    await tick()

    expect(document.activeElement).toBe(trigger())
  })

  test(`hover honors delays and stays open across the trigger-surface gap`, async () => {
    vi.useFakeTimers()
    mount_popover({ trigger_mode: `hover`, open_delay: 40 })

    trigger().dispatchEvent(new MouseEvent(`mouseenter`))
    expect(vi.getTimerCount()).toBe(1)
    await advance_time(39)
    expect(surface()).toBeNull()
    expect(vi.getTimerCount()).toBe(1)

    await advance_time(1)
    const dialog = doc_query(`[role="dialog"]`)

    // An 8px CSS gap reports body, not the surface, as relatedTarget while crossed.
    trigger().dispatchEvent(
      new MouseEvent(`mouseleave`, { relatedTarget: document.body }),
    )
    await vi.advanceTimersByTimeAsync(100)
    dialog.dispatchEvent(new MouseEvent(`mouseenter`, { relatedTarget: document.body }))
    await advance_time(150)
    expect(surface()).toBe(dialog)

    dialog.dispatchEvent(new MouseEvent(`mouseleave`, { relatedTarget: document.body }))
    await advance_time(149)
    expect(surface()).toBe(dialog)
    await advance_time(1)
    expect(surface()).toBeNull()
  })

  test.each([`hover`, `focus`] as const)(
    `%s keeps focus transitions between trigger and surface open`,
    async (trigger_mode) => {
      vi.useFakeTimers()
      mount_popover({ trigger_mode, close_delay: 25 })
      const outside = document.createElement(`button`)
      document.body.append(outside)

      trigger().focus()
      await advance_time(0)
      const item = doc_query<HTMLButtonElement>(`[data-testid="popover-item"]`)
      // Non-click opening must not steal focus before the user moves it.
      expect(document.activeElement).toBe(trigger())

      item.focus()
      await advance_time(25)
      expect(surface()).not.toBeNull()

      outside.focus()
      await advance_time(24)
      expect(surface()).not.toBeNull()
      await advance_time(1)
      expect(surface()).toBeNull()
      expect(document.activeElement).toBe(outside)
    },
  )

  test(`hover stays open while either pointer or focus remains inside`, async () => {
    vi.useFakeTimers()
    mount_popover({ trigger_mode: `hover`, close_delay: 20 })
    const outside = document.createElement(`button`)
    document.body.append(outside)

    trigger().focus()
    await advance_time(0)
    trigger().dispatchEvent(new MouseEvent(`mouseenter`))
    outside.focus()
    await advance_time(20)
    expect(surface()).not.toBeNull()

    trigger().dispatchEvent(
      new MouseEvent(`mouseleave`, { relatedTarget: document.body }),
    )
    await advance_time(20)
    expect(surface()).toBeNull()

    trigger().dispatchEvent(new MouseEvent(`mouseenter`))
    await advance_time(0)
    trigger().focus()
    trigger().dispatchEvent(
      new MouseEvent(`mouseleave`, { relatedTarget: document.body }),
    )
    await advance_time(20)
    expect(surface()).not.toBeNull()

    outside.focus()
    await advance_time(20)
    expect(surface()).toBeNull()
  })

  test(`Escape from a focus popover closes without immediately reopening`, async () => {
    vi.useFakeTimers()
    mount_popover({ trigger_mode: `focus` })
    const outside = document.createElement(`button`)
    document.body.append(outside)

    trigger().focus()
    await advance_time(0)
    doc_query<HTMLButtonElement>(`[data-testid="popover-item"]`).focus()

    document.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
    await advance_time(0)
    expect(surface()).toBeNull()
    expect(document.activeElement).toBe(trigger())

    outside.focus()
    trigger().focus()
    await advance_time(0)
    expect(surface()).not.toBeNull()
  })

  test(`Escape outside a focus popover does not block its next focus-open`, async () => {
    vi.useFakeTimers()
    mount_popover({ open: true, trigger_mode: `focus`, trap_focus: false })
    await tick()

    document.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
    await advance_time(0)
    expect(surface()).toBeNull()

    trigger().focus()
    await advance_time(0)
    expect(surface()).not.toBeNull()
  })

  // Removing a focused surface delivers no focusout, and focus_trap then hands focus
  // back to the trigger. Without dropping the stale focus state on close, that focusin
  // reopens what was just dismissed.
  test.each([`hover`, `focus`] as const)(
    `%s dismissal with focus inside stays closed`,
    async (trigger_mode) => {
      vi.useFakeTimers()
      const props = mount_popover({ trigger_mode, open_delay: 0, close_delay: 10 })
      trigger().focus()
      await advance_time(0)
      doc_query<HTMLButtonElement>(`[data-testid="popover-item"]`).focus()
      await advance_time(0)
      expect(surface()).not.toBeNull()

      props.open = false
      await advance_time(100)
      expect(surface()).toBeNull()
    },
  )

  // Same stale state seen from the other side: with nothing to restore focus to, a later
  // hover cycle must still close on mouseleave instead of waiting on a focus that left.
  test(`hover-out still closes after a dismissal that stranded focus`, async () => {
    vi.useFakeTimers()
    const props = mount_popover({
      trigger_mode: `hover`,
      open_delay: 0,
      close_delay: 10,
      trap_focus: false,
    })
    trigger().dispatchEvent(new MouseEvent(`mouseenter`))
    await advance_time(0)
    doc_query<HTMLButtonElement>(`[data-testid="popover-item"]`).focus()
    await advance_time(0)
    props.open = false
    await advance_time(100)

    trigger().dispatchEvent(new MouseEvent(`mouseenter`))
    await advance_time(0)
    expect(surface()).not.toBeNull()
    trigger().dispatchEvent(
      new MouseEvent(`mouseleave`, { relatedTarget: document.body }),
    )
    await advance_time(100)
    expect(surface()).toBeNull()
  })

  test(`controlled open state stays in sync`, async () => {
    const props = mount_popover({ open: true, placement: `right` })
    await tick()

    const dialog = doc_query(`[role="dialog"]`)
    expect(dialog.dataset.placement).toBe(`right`)
    expect(trigger().getAttribute(`aria-expanded`)).toBe(`true`)

    props.open = false
    await tick()
    expect(surface()).toBeNull()
    expect(trigger().getAttribute(`aria-expanded`)).toBe(`false`)
  })

  // A torn-down component cannot render a surface either way, so asserting on the DOM
  // alone cannot tell a cancelled timer from one that still fires. Watch the timer id.
  test(`unmount cancels a pending delayed open`, async () => {
    vi.useFakeTimers()
    mount_popover({ trigger_mode: `hover`, open_delay: 50 })
    await tick()
    const set_timeout = vi.spyOn(globalThis, `setTimeout`)
    const clear_timeout = vi.spyOn(globalThis, `clearTimeout`)
    trigger().dispatchEvent(new MouseEvent(`mouseenter`))
    const pending_timer = set_timeout.mock.results.at(-1)?.value as unknown
    expect(pending_timer).toBeDefined()

    const app = mounted.pop()
    if (!app) throw new Error(`Popover test app was not mounted`)
    await unmount(app)
    expect(clear_timeout).toHaveBeenCalledWith(pending_timer)

    await advance_time(50)
    expect(surface()).toBeNull()
  })

  test(`changing trigger mode invalidates a pending delayed open`, async () => {
    vi.useFakeTimers()
    const props = mount_popover({ trigger_mode: `hover`, open_delay: 50 })
    trigger().dispatchEvent(new MouseEvent(`mouseenter`))

    props.trigger_mode = `click`
    await advance_time(50)
    expect(surface()).toBeNull()
  })
})
