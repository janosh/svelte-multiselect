import type { ComponentProps } from 'svelte'
import { mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query, escape_key, pointer_event } from './index'
import TestSheet from './TestSheet.svelte'

describe(`Sheet`, () => {
  type SheetProps = ComponentProps<typeof TestSheet>
  const mounted: Record<string, unknown>[] = []

  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
    document.body.style.removeProperty(`overflow`)
  })

  const mount_sheet = (extra: Partial<SheetProps> = {}) => {
    const props = $state({ ...extra })
    mounted.push(mount(TestSheet, { target: document.body, props }))
    return props
  }
  const trigger = () => doc_query<HTMLButtonElement>(`[data-testid="sheet-trigger"]`)
  const surface = () => document.querySelector<HTMLElement>(`.sheet`)

  test(`trigger opens an accessible portalled dialog and moves focus inside`, async () => {
    mount_sheet({ id: `settings-sheet` })
    expect(surface()).toBeNull()
    expect(trigger().getAttribute(`aria-expanded`)).toBe(`false`)

    trigger().focus()
    trigger().click()
    await tick()

    const dialog = doc_query(`.sheet`)
    expect(dialog.parentElement?.classList.contains(`sheet-layer`)).toBe(true)
    expect(dialog.closest(`.sheet-portal`)?.parentElement).toBe(document.body)
    expect(dialog.getAttribute(`role`)).toBe(`dialog`)
    expect(dialog.getAttribute(`aria-modal`)).toBe(`true`)
    expect(dialog.getAttribute(`aria-labelledby`)).toBe(`test-sheet-title`)
    expect(dialog.id).toBe(`settings-sheet`)
    expect(dialog.id).toBe(trigger().getAttribute(`aria-controls`))
    expect(trigger().getAttribute(`aria-expanded`)).toBe(`true`)
    expect(document.activeElement).toBe(doc_query(`[data-testid="sheet-close"]`))
    expect(doc_query(`[data-testid="sheet-footer"]`).textContent).toBe(`Unsaved changes`)
  })

  test.each([`top`, `right`, `bottom`, `left`] as const)(
    `places the sheet on the %s`,
    async (side) => {
      mount_sheet({ open: true, side })
      await tick()
      expect(doc_query(`.sheet`).dataset.side).toBe(side)
    },
  )

  test.each([
    [`Escape`, `escape`, () => document.dispatchEvent(escape_key())],
    [
      `the backdrop`,
      `pointer`,
      () =>
        doc_query(`.sheet-backdrop`).dispatchEvent(pointer_event(`pointerdown`, 0, 0)),
    ],
  ] as const)(`%s closes and restores focus`, async (_label, via, dismiss) => {
    const on_close = vi.fn()
    mount_sheet({ on_close })
    trigger().focus()
    trigger().click()
    await tick()

    dismiss()
    await tick()

    expect(surface()).toBeNull()
    expect(on_close).toHaveBeenCalledWith({ via })
    expect(document.activeElement).toBe(trigger())
  })

  test(`presses inside do not dismiss`, async () => {
    const on_close = vi.fn()
    mount_sheet({ open: true, on_close })
    await tick()

    doc_query(`.sheet`).dispatchEvent(pointer_event(`pointerdown`, 0, 0))
    await tick()

    expect(surface()).not.toBeNull()
    expect(on_close).not.toHaveBeenCalled()
  })

  test(`snippet controls close through the controlled state`, async () => {
    const on_close = vi.fn()
    const props = mount_sheet({ open: true, on_close })
    await tick()

    doc_query<HTMLButtonElement>(`[data-testid="sheet-action"]`).click()
    await tick()
    expect(props.open).toBe(false)
    expect(surface()).toBeNull()
    expect(on_close).toHaveBeenCalledWith({ via: `close` })

    props.open = true
    await tick()
    expect(surface()).not.toBeNull()
    props.open = false
    await tick()
    expect(surface()).toBeNull()
    expect(on_close).toHaveBeenCalledTimes(1)
  })

  test(`dismissal options can leave backdrop and Escape to the consumer`, async () => {
    mount_sheet({
      open: true,
      close_on_backdrop: false,
      close_on_escape: false,
    })
    await tick()

    doc_query(`.sheet-backdrop`).dispatchEvent(pointer_event(`pointerdown`, 0, 0))
    document.dispatchEvent(escape_key())
    await tick()

    expect(surface()).not.toBeNull()
  })

  test(`Tab stays in the sheet`, async () => {
    mount_sheet({ open: true })
    await tick()
    const close_button = doc_query<HTMLButtonElement>(`[data-testid="sheet-close"]`)
    const action_button = doc_query<HTMLButtonElement>(`[data-testid="sheet-action"]`)

    expect(document.activeElement).toBe(close_button)
    close_button.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Tab`, bubbles: true }),
    )
    expect(document.activeElement).toBe(action_button)
    action_button.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `Tab`, bubbles: true }),
    )
    expect(document.activeElement).toBe(close_button)
  })

  test(`open sheet makes background inert and restores prior overflow`, async () => {
    const background = document.createElement(`main`)
    const already_inert = document.createElement(`aside`)
    already_inert.setAttribute(`inert`, `preserved`)
    document.body.append(background, already_inert)
    document.body.style.setProperty(`overflow`, `clip`, `important`)

    const props = mount_sheet({ open: true })
    await tick()
    expect(background.hasAttribute(`inert`)).toBe(true)
    expect(already_inert.getAttribute(`inert`)).toBe(``)
    expect(document.body.style.getPropertyValue(`overflow`)).toBe(`hidden`)
    expect(document.body.style.getPropertyPriority(`overflow`)).toBe(``)
    expect(
      doc_query(`[data-testid="sheet-surface"]`)
        .closest(`.sheet-portal`)
        ?.hasAttribute(`inert`),
    ).toBe(false)

    props.open = false
    await tick()
    expect(background.hasAttribute(`inert`)).toBe(false)
    expect(already_inert.getAttribute(`inert`)).toBe(`preserved`)
    expect(document.body.style.getPropertyValue(`overflow`)).toBe(`clip`)
    expect(document.body.style.getPropertyPriority(`overflow`)).toBe(`important`)
  })

  test(`unmount removes the portal host and its listeners`, async () => {
    const on_close = vi.fn()
    const background = document.createElement(`main`)
    document.body.append(background)
    document.body.style.overflow = `scroll`
    mount_sheet({ open: true, on_close })
    await tick()
    expect(background.hasAttribute(`inert`)).toBe(true)
    expect(document.body.style.overflow).toBe(`hidden`)

    const app = mounted.pop()
    if (!app) throw new Error(`Sheet test app was not mounted`)
    await unmount(app)
    document.dispatchEvent(escape_key())
    await tick()

    expect(document.querySelector(`.sheet-portal`)).toBeNull()
    expect(on_close).not.toHaveBeenCalled()
    expect(background.hasAttribute(`inert`)).toBe(false)
    expect(document.body.style.overflow).toBe(`scroll`)
  })
})
