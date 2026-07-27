import { ContextMenu } from '$lib'
import type { CmdAction } from '$lib/types'
import type { ComponentProps } from 'svelte'
import { createRawSnippet, mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query, stub_prop } from './index'

describe(`ContextMenu`, () => {
  type MenuProps = Partial<Omit<ComponentProps<typeof ContextMenu>, `actions`>>
  const make_actions = (): CmdAction[] => [
    { label: `Copy`, action: vi.fn(), shortcut: `mod+c` },
    { label: `Delete`, action: vi.fn(), disabled: true },
  ]
  // svelte:body listeners outlive document.body.innerHTML = '', so unmount for real
  // or a previous test's menu keeps answering right-clicks
  const mounted: Record<string, unknown>[] = []
  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
    Reflect.deleteProperty(globalThis.navigator, `userAgent`)
  })
  const mount_menu = (actions: CmdAction[], extra: MenuProps = {}) => {
    const props = $state({ actions, ...extra })
    mounted.push(mount(ContextMenu, { target: document.body, props }))
  }
  const right_click = (target: EventTarget, clientX = 120, clientY = 240) => {
    const event = new MouseEvent(`contextmenu`, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    })
    target.dispatchEvent(event)
    return event
  }
  // mounts a menu and right-clicks the page to open it, returning the contextmenu event
  const open_menu = async (actions = make_actions(), extra: MenuProps = {}) => {
    mount_menu(actions, extra)
    const event = right_click(document.body)
    await tick()
    return event
  }
  const menu = () => document.querySelector(`menu[role="menu"]`)
  const items = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>(`[role="menuitem"]`))

  test(`a right-click opens the menu at the pointer, replacing the native one`, async () => {
    mount_menu(make_actions(), { class: `consumer-class` })
    expect(menu()).toBeNull()

    const event = right_click(document.body)
    await tick()

    expect(event.defaultPrevented).toBe(true)
    expect(items().map((item) => item.querySelector(`span`)?.textContent)).toEqual([
      `Copy`,
      `Delete`,
    ])
    // float anchored the menu on the pointer rather than on any element
    const surface = doc_query(`menu[role="menu"]`)
    const { position, left, top } = surface.style
    expect([position, left, top]).toEqual([`fixed`, `120px`, `240px`])
    // .context-menu comes after the {...rest} spread, so a consumer class adds to the
    // styling hook instead of replacing it
    expect(surface.classList.contains(`context-menu`)).toBe(true)
    expect(surface.classList.contains(`consumer-class`)).toBe(true)
  })

  // with a region, svelte:body's handler is dropped, so the rest of the page keeps
  // the browser's own menu
  test(`a children region scopes the right-click to itself`, async () => {
    const children = createRawSnippet(() => ({
      render: () => `<div data-testid="region">region</div>`,
    }))
    mount_menu(make_actions(), { children })

    const outside = right_click(document.body)
    await tick()
    expect(menu()).toBeNull()
    expect(outside.defaultPrevented).toBe(false)

    right_click(doc_query(`[data-testid="region"]`))
    await tick()
    expect(menu()).not.toBeNull()
  })

  test(`an item snippet replaces the default label and shortcut markup`, async () => {
    const item = createRawSnippet<[{ action: CmdAction }]>((get_params) => ({
      render: () => `<span data-testid="custom">${get_params().action.label}!</span>`,
    }))
    await open_menu(make_actions(), { item })

    expect(items().map((btn) => btn.textContent?.trim())).toEqual([`Copy!`, `Delete!`])
    expect(document.querySelector(`kbd`)).toBeNull() // default shortcut markup is gone
  })

  test.each([
    [`Macintosh; Intel Mac OS X 10_15`, [`⌘`, `C`]],
    [`X11; Linux x86_64`, [`Ctrl`, `C`]],
  ])(`renders mod as the platform's key (%s)`, async (user_agent, expected) => {
    stub_prop(globalThis.navigator, `userAgent`, user_agent) // undone in afterEach
    await open_menu()

    expect([...items()[0].querySelectorAll(`kbd`)].map((key) => key.textContent)).toEqual(
      expected,
    )
  })

  test(`arrow keys walk the menu, wrapping and skipping disabled items`, async () => {
    const actions: CmdAction[] = [
      { label: `One`, action: vi.fn() },
      { label: `Two`, action: vi.fn(), disabled: true },
      { label: `Three`, action: vi.fn() },
    ]
    await open_menu(actions)
    const [one, , three] = items()
    expect(document.activeElement).toBe(one) // focus_trap entered at the first item

    const press = (key: string) =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent(`keydown`, { key, bubbles: true, cancelable: true }),
      )

    press(`ArrowDown`)
    expect(document.activeElement).toBe(three) // disabled `Two` is skipped
    press(`ArrowDown`)
    expect(document.activeElement).toBe(one) // wraps past the end
    press(`ArrowUp`)
    expect(document.activeElement).toBe(three) // and back past the start
    press(`Home`)
    expect(document.activeElement).toBe(one)
    press(`End`)
    expect(document.activeElement).toBe(three)
  })

  test(`choosing an action runs it and closes, disabled ones do neither`, async () => {
    const actions = make_actions()
    const on_select = vi.fn()
    await open_menu(actions, { on_select })

    items()[1].click() // disabled
    await tick()
    expect(actions[1].action).not.toHaveBeenCalled()
    expect(on_select).not.toHaveBeenCalled()
    expect(menu()).not.toBeNull()

    items()[0].click()
    await tick()
    expect(actions[0].action).toHaveBeenCalledWith(`Copy`)
    expect(on_select).toHaveBeenCalledWith(actions[0])
    expect(menu()).toBeNull()
  })

  // both bubble to the document listeners that own dismissal
  test.each([
    [`Escape`, () => new KeyboardEvent(`keydown`, { key: `Escape`, bubbles: true })],
    [`a press outside`, () => new PointerEvent(`pointerdown`, { bubbles: true })],
  ])(`%s dismisses the menu`, async (_desc, make_event) => {
    await open_menu()
    expect(menu()).not.toBeNull()

    document.body.dispatchEvent(make_event())
    await tick()
    expect(menu()).toBeNull()
  })

  test(`stays shut when disabled or when there is nothing to show`, async () => {
    const event = await open_menu(make_actions(), { disabled: true })
    expect(menu()).toBeNull()
    expect(event.defaultPrevented).toBe(false) // the browser menu still opens

    await open_menu([])
    expect(menu()).toBeNull()
  })
})
