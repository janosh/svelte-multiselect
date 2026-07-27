import type { ComponentProps } from 'svelte'
import { mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import type Popover from '$lib/Popover.svelte'
import { doc_query } from './index'
import TestPopover from './TestPopover.svelte'

describe(`Popover`, () => {
  type PopoverProps = Omit<ComponentProps<typeof Popover>, `children`>
  // click_outside and focus_trap register document listeners that outlive
  // document.body.innerHTML = '', so unmount for real between cases
  const mounted: Record<string, unknown>[] = []
  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
  })
  const mount_popover = (extra: Partial<PopoverProps> = {}) => {
    const props = $state({ ...extra })
    mounted.push(mount(TestPopover, { target: document.body, props }))
  }
  const trigger = () => doc_query<HTMLButtonElement>(`[data-testid="popover-trigger"]`)
  const surface = () => document.querySelector(`[role="dialog"]`)
  const press = (target: EventTarget) =>
    target.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true }))

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
})
