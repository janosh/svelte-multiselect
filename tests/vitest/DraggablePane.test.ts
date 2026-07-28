import DraggablePane from '$lib/DraggablePane.svelte'
import { createRawSnippet, mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query, mock_rect, mouse_event, stub_prop } from './index'

describe(`DraggablePane`, () => {
  // click_outside registers document listeners that outlive innerHTML = '', and
  // stubbed globals must not leak into the next case
  const mounted: Record<string, unknown>[] = []
  const cleanups: (() => void)[] = []
  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
    for (const undo of cleanups.splice(0)) undo()
    vi.useRealTimers()
  })

  // raw snippets render once, so this captures the payload rather than tracking it;
  // the reactive half of the pane state is asserted through the DOM below
  let last_pane_state: Record<string, unknown> = {}
  const children = createRawSnippet<[Record<string, unknown>]>((state) => ({
    render: () => {
      last_pane_state = state()
      return `<div data-testid="content">pane content</div>`
    },
  }))

  type PaneProps = Record<string, unknown>
  const setup = async (props: PaneProps = {}) => {
    mounted.push(
      mount(DraggablePane, { target: document.body, props: { children, ...props } }),
    )
    await tick()
    return {
      toggle: doc_query<HTMLButtonElement>(`button.pane-toggle`),
      pane: doc_query<HTMLDivElement>(`[role="dialog"]`),
    }
  }

  // Toggle bottom-right at (320, 420) in a 1000x500 viewport, pane 450 wide.
  const mock_viewport = (inner_width = 1000, inner_height = 500) => {
    cleanups.push(stub_prop(globalThis, `innerWidth`, inner_width))
    cleanups.push(stub_prop(globalThis, `innerHeight`, inner_height))
  }

  // for the tests that need no geometry mocked before the pane opens
  const open_pane = async (props: PaneProps = {}) => {
    const refs = await setup(props)
    refs.toggle.click()
    await tick()
    return refs
  }

  const press = (target: EventTarget) =>
    target.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true }))
  const escape = () =>
    document.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true }))
  const is_open = (pane: HTMLElement) => pane.style.display === `grid`

  // the press-move-release both attachments listen for, on the pane (resize) or on
  // its handle (drag)
  const drag = (
    target: EventTarget,
    [start_x, start_y]: readonly number[],
    [end_x, end_y]: readonly number[],
  ) => {
    target.dispatchEvent(mouse_event(`mousedown`, start_x, start_y))
    globalThis.dispatchEvent(mouse_event(`mousemove`, end_x, end_y))
    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  }
  const drag_by = (dx: number, dy: number) =>
    drag(doc_query(`.drag-handle`), [0, 0], [dx, dy])

  test(`toggle opens the pane, flips aria-expanded and swaps the icon`, async () => {
    const { toggle, pane } = await setup()
    expect(is_open(pane)).toBe(false)
    expect(toggle.getAttribute(`aria-expanded`)).toBe(`false`)

    toggle.click()
    await tick()
    expect(is_open(pane)).toBe(true)
    expect(toggle.getAttribute(`aria-expanded`)).toBe(`true`)
    // closed_icon is Expand, open_icon is Cross — different paths, so the swap shows
    const open_path = doc_query(`button.pane-toggle path`).getAttribute(`d`)

    toggle.click()
    await tick()
    expect(is_open(pane)).toBe(false)
    expect(doc_query(`button.pane-toggle path`).getAttribute(`d`)).not.toBe(open_path)
  })

  test.each([
    [`toggle`, (toggle: HTMLElement) => toggle.click()],
    [`button`, () => doc_query<HTMLButtonElement>(`.close-button`).click()],
    [`pointer`, () => press(document.body)],
    [`escape`, () => escape()],
  ] as const)(`closes via %s`, async (via, dismiss) => {
    const on_close = vi.fn()
    const { toggle, pane } = await open_pane({ on_close })
    // the close button only exists once the pane has been moved
    if (via === `button`) {
      drag_by(0, 0)
      await tick()
    }

    dismiss(toggle)
    await tick()

    expect(is_open(pane)).toBe(false)
    expect(on_close).toHaveBeenCalledWith({ via })
  })

  test(`persistent ignores an outside press but honours Escape`, async () => {
    const on_close = vi.fn()
    const { pane } = await open_pane({ persistent: true, on_close })

    press(document.body)
    await tick()
    expect(is_open(pane)).toBe(true)
    expect(on_close).not.toHaveBeenCalled()

    escape()
    await tick()
    expect(is_open(pane)).toBe(false)
    expect(on_close).toHaveBeenCalledWith({ via: `escape` })
  })

  test(`Escape while closed leaves the pane alone and the key to the page`, async () => {
    const on_close = vi.fn()
    await setup({ on_close })

    const event = new KeyboardEvent(`keydown`, {
      key: `Escape`,
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(event)
    await tick()

    expect(on_close).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  // The whole point of position="fixed": a toggle low on screen or hard against the
  // right edge must not park the pane off-viewport.
  test.each([
    // [description, toggle rect, expected left, top, --pane-viewport-clamp]
    // the top clamps to 500 - 180 - 8, leaving exactly that 180 below it
    [`bottom edge`, { left: 300, top: 400 }, `8px`, `312px`, `180px`],
    [`right edge`, { left: 970, top: 20 }, `542px`, `45px`, `447px`], // left = 1000 - 450 - 8
    [`no clamping needed`, { left: 600, top: 20 }, `175px`, `45px`, `447px`], // 620 - 450 + 5
  ])(`fixed positioning clamps against the %s`, async (_desc, rect, left, top, clamp) => {
    mock_viewport()
    const { toggle, pane } = await setup({ position: `fixed` })
    mock_rect(toggle, { ...rect, width: 20, height: 20 })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

    toggle.click()
    await tick()

    expect(pane.style.left).toBe(left)
    expect(pane.style.top).toBe(top)
    // the room left below the pane's top edge, which CSS min()s into its max-height
    expect(pane.style.getPropertyValue(`--pane-viewport-clamp`)).toBe(clamp)
  })

  test(`absolute positioning measures against the offsetParent`, async () => {
    const ancestor = document.createElement(`div`)
    document.body.append(ancestor)
    mock_rect(ancestor, { left: 100, top: 50, width: 800, height: 600 })
    const { toggle, pane } = await setup()
    cleanups.push(stub_prop(toggle, `offsetParent`, ancestor))
    mock_rect(toggle, { left: 700, top: 300, width: 20, height: 20 })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

    toggle.click()
    await tick()

    expect(pane.style.left).toBe(`175px`) // 720 - 100 - 450 + 5
    expect(pane.style.top).toBe(`275px`) // 320 - 50 + 5
    // absolute panes scroll with the page, so no viewport cap is written
    expect(pane.style.getPropertyValue(`--pane-viewport-clamp`)).toBe(``)
  })

  test(`falls back to document coordinates without a positioned ancestor`, async () => {
    cleanups.push(stub_prop(globalThis, `scrollX`, 30))
    cleanups.push(stub_prop(globalThis, `scrollY`, 60))
    const { toggle, pane } = await setup()
    cleanups.push(stub_prop(toggle, `offsetParent`, null))
    mock_rect(toggle, { left: 700, top: 300, width: 20, height: 20 })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

    toggle.click()
    await tick()

    expect(pane.style.left).toBe(`305px`) // 720 - 450 + 5 + 30
    expect(pane.style.top).toBe(`385px`) // 320 + 5 + 60
  })

  test(`reset returns a dragged pane to its anchor and hides the controls`, async () => {
    const ancestor = document.createElement(`div`)
    document.body.append(ancestor)
    mock_rect(ancestor, { left: 0, top: 0, width: 800, height: 600 })
    const { toggle, pane } = await setup()
    cleanups.push(stub_prop(toggle, `offsetParent`, ancestor))
    mock_rect(toggle, { left: 500, top: 100, width: 20, height: 20 })
    mock_rect(pane, { left: 75, top: 125, width: 450, height: 300 })

    toggle.click()
    await tick()
    const anchored = { left: pane.style.left, top: pane.style.top }
    expect(anchored).toEqual({ left: `75px`, top: `125px` })
    expect(document.querySelector(`.reset-button`)).toBeNull()

    drag_by(60, 40)
    await tick()
    expect({ left: pane.style.left, top: pane.style.top }).toEqual({
      left: `135px`,
      top: `165px`,
    })

    doc_query<HTMLButtonElement>(`.reset-button`).click()
    await tick()

    expect({ left: pane.style.left, top: pane.style.top }).toEqual(anchored)
    // the controls hide again, which is the pane reporting has_been_dragged = false
    expect(document.querySelector(`.reset-button`)).toBeNull()
  })

  test(`a drag reports through on_drag_start and data-dragging`, async () => {
    const on_drag_start = vi.fn()
    const { pane } = await open_pane({ on_drag_start })
    expect(pane.dataset.dragging).toBe(`false`)

    doc_query(`.drag-handle`).dispatchEvent(mouse_event(`mousedown`, 0, 0))
    await tick()
    expect(on_drag_start).toHaveBeenCalledTimes(1)
    expect(pane.dataset.dragging).toBe(`true`)

    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
    await tick()
    expect(pane.dataset.dragging).toBe(`false`)
  })

  // The toggle snippet exists because matterviz passes icons this library doesn't
  // bundle (Info, Filter, Export, Orbit), which Icon.svelte swaps for its Alert fallback
  test(`both snippets get the pane state, and toggle replaces the button content`, async () => {
    let toggle_state: Record<string, unknown> = {}
    const toggle = createRawSnippet<[Record<string, unknown>]>((state) => ({
      render: () => {
        toggle_state = state()
        return `<span data-testid="custom-toggle">custom</span>`
      },
    }))
    const { toggle: toggle_btn } = await setup({ show: true, toggle })

    const pane_state = {
      show: true,
      show_controls: false,
      has_been_dragged: false,
      dragging: false,
    }
    expect(last_pane_state).toEqual(pane_state)
    expect(toggle_state).toEqual(pane_state)
    expect(toggle_btn.querySelector(`[data-testid="custom-toggle"]`)).not.toBeNull()
    // the bundled icon is gone, but the button (and its aria wiring) is still ours
    expect(toggle_btn.querySelector(`svg`)).toBeNull()
    expect(toggle_btn.getAttribute(`aria-expanded`)).toBe(`true`)
  })

  test.each([
    [`both`, [445, 150], [545, 150], { width: `550px`, height: `300px` }],
    [`both`, [200, 295], [200, 395], { width: `450px`, height: `400px` }],
    [`width`, [445, 150], [545, 150], { width: `550px`, height: `300px` }],
    [`height`, [200, 295], [200, 395], { width: `450px`, height: `400px` }],
    // height mode leaves the right edge alone, so the press does nothing
    [`height`, [445, 150], [545, 150], { width: ``, height: `` }],
  ] as const)(
    `resize=%s drag from (%o) sets the pane size`,
    async (resize, [start_x, start_y], [end_x, end_y], expected) => {
      const { pane } = await open_pane({ resize })
      mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

      drag(pane, [start_x, start_y], [end_x, end_y])
      await tick()

      expect({ width: pane.style.width, height: pane.style.height }).toEqual(expected)
    },
  )

  // Known limitation of `resizable`: get_edge returns a single edge and tests `right`
  // first, so a press in the corner where both zones overlap resizes width only. The
  // grip there is an affordance for "this pane resizes", not a two-axis handle.
  test(`a corner press resizes one axis, not both`, async () => {
    const { pane } = await open_pane({ resize: `both` })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

    drag(pane, [445, 295], [545, 395])
    await tick()

    expect(pane.style.width).toBe(`550px`)
    expect(pane.style.height).toBe(`300px`) // pinned at its start height, not 400px
  })

  test(`a resize opts the pane out of repositioning and reveals the controls`, async () => {
    const { pane } = await open_pane({ resize: `both` })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })
    expect(document.querySelector(`.reset-button`)).toBeNull()

    pane.dispatchEvent(mouse_event(`mousedown`, 445, 150))
    await tick()

    expect(document.querySelector(`.reset-button`)).not.toBeNull()
    globalThis.dispatchEvent(new MouseEvent(`mouseup`, { bubbles: true }))
  })

  test(`resize="none" renders no grip and ignores an edge press`, async () => {
    const { pane } = await open_pane({ resize: `none` })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

    expect(document.querySelector(`.resize-grip`)).toBeNull()
    pane.dispatchEvent(mouse_event(`mousedown`, 445, 150))
    globalThis.dispatchEvent(mouse_event(`mousemove`, 545, 150))
    expect(pane.style.width).toBe(``)
  })

  test.each([
    [`both`, `8px`, `8px`],
    [`width`, `8px`, ``],
    [`height`, ``, `8px`],
    [`none`, ``, ``],
  ] as const)(
    `resize=%s reserves a %s / %s grab gutter clear of the content`,
    async (resize, padding_right, padding_bottom) => {
      const { pane } = await setup({ resize })
      expect(pane.style.paddingRight).toBe(padding_right)
      expect(pane.style.paddingBottom).toBe(padding_bottom)
    },
  )

  // click_outside dismisses on pointerdown, so the click browsers (and Playwright)
  // synthesize after a resize never reaches it — matterviz's 200 ms post-resize guard
  // against exactly that is unnecessary here.
  test(`a resize released outside the pane does not dismiss it`, async () => {
    const on_close = vi.fn()
    const { pane } = await open_pane({ resize: `both`, on_close })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

    // press on the grip gutter, drag past the pane, release over the page
    press(pane)
    drag(pane, [445, 150], [900, 150])
    document.body.dispatchEvent(new MouseEvent(`click`, { bubbles: true }))
    await tick()

    expect(is_open(pane)).toBe(true)
    expect(on_close).not.toHaveBeenCalled()
  })

  test(`a press on the toggle counts as inside, so its click still toggles`, async () => {
    const on_close = vi.fn()
    const { toggle, pane } = await open_pane({ on_close })

    press(toggle)
    press(doc_query(`[data-testid="content"]`))
    await tick()
    expect(is_open(pane)).toBe(true)
    expect(on_close).not.toHaveBeenCalled()

    toggle.click()
    await tick()
    expect(is_open(pane)).toBe(false)
    expect(on_close).toHaveBeenCalledWith({ via: `toggle` })
  })

  test(`a window resize repositions an unmoved pane but not a dragged one`, async () => {
    vi.useFakeTimers()
    mock_viewport()
    const { toggle, pane } = await setup({ position: `fixed` })
    mock_rect(toggle, { left: 600, top: 20, width: 20, height: 20 })
    mock_rect(pane, { left: 0, top: 0, width: 450, height: 300 })

    toggle.click()
    await tick()
    expect(pane.style.left).toBe(`175px`)

    cleanups.push(stub_prop(globalThis, `innerWidth`, 600))
    globalThis.dispatchEvent(new Event(`resize`))
    vi.advanceTimersByTime(60)
    await tick()
    expect(pane.style.left).toBe(`142px`) // 600 - 450 - 8

    // draggable starts from the pane's mocked offsetLeft of 0, so a 20px drag lands
    // at 20px — and stays there, where repositioning would give 900 - 450 - 8 = 442
    drag_by(20, 0)
    cleanups.push(stub_prop(globalThis, `innerWidth`, 900))
    globalThis.dispatchEvent(new Event(`resize`))
    vi.advanceTimersByTime(60)
    await tick()
    expect(pane.style.left).toBe(`20px`)
  })

  test(`spreads consumer props without losing its own class, role or click`, async () => {
    const onclick = vi.fn()
    const { toggle, pane } = await setup({
      pane_props: { class: `consumer-pane`, id: `my-pane` },
      toggle_props: { class: `consumer-toggle`, title: `Options`, onclick },
    })

    expect(pane.id).toBe(`my-pane`)
    expect(pane.classList.contains(`draggable-pane`)).toBe(true)
    expect(pane.classList.contains(`consumer-pane`)).toBe(true)
    // Toc skips headings whose closest() match is excluded, so pane content (floating
    // chrome, not page structure) stays out of a page's contents
    expect(pane.classList.contains(`toc-exclude`)).toBe(true)
    expect(toggle.classList.contains(`pane-toggle`)).toBe(true)
    expect(toggle.classList.contains(`consumer-toggle`)).toBe(true)

    // the spread lands before our own onclick, so without chaining theirs is dropped
    toggle.click()
    await tick()
    expect(onclick).toHaveBeenCalledOnce()
    expect(pane.style.display).toBe(`grid`) // our own handler still opened it
  })
})
