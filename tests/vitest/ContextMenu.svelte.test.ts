import { ContextMenu } from '$lib'
import type { CmdAction } from '$lib/types'
import { mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

describe(`ContextMenu`, () => {
  const make_actions = (): CmdAction[] => [
    { label: `Copy`, action: vi.fn(), shortcut: `mod+c` },
    { label: `Delete`, action: vi.fn(), disabled: true },
  ]
  // svelte:body listeners outlive document.body.innerHTML = '', so unmount for real
  // or a previous test's menu keeps answering right-clicks
  const mounted: Record<string, unknown>[] = []
  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
  })
  const mount_menu = (actions: CmdAction[], extra = {}) => {
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
  const open_menu = async (actions = make_actions(), extra = {}) => {
    mount_menu(actions, extra)
    const event = right_click(document.body)
    await tick()
    return event
  }
  const menu = () => document.querySelector(`menu[role="menu"]`)
  const items = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>(`[role="menuitem"]`))

  test(`a right-click opens the menu at the pointer, replacing the native one`, async () => {
    mount_menu(make_actions())
    expect(menu()).toBeNull()

    const event = right_click(document.body)
    await tick()

    expect(event.defaultPrevented).toBe(true)
    expect(items().map((item) => item.querySelector(`span`)?.textContent)).toEqual([
      `Copy`,
      `Delete`,
    ])
    // float anchored the menu on the pointer rather than on any element
    const { position, left, top } = doc_query(`menu[role="menu"]`).style
    expect([position, left, top]).toEqual([`fixed`, `120px`, `240px`])
  })

  test.each([
    [`Macintosh; Intel Mac OS X 10_15`, [`⌘`, `C`]],
    [`X11; Linux x86_64`, [`Ctrl`, `C`]],
  ])(`renders mod as the platform's key (%s)`, async (user_agent, expected) => {
    Object.defineProperty(globalThis.navigator, `userAgent`, {
      value: user_agent,
      configurable: true,
    })
    await open_menu()

    expect([...items()[0].querySelectorAll(`kbd`)].map((key) => key.textContent)).toEqual(
      expected,
    )
    Reflect.deleteProperty(globalThis.navigator, `userAgent`)
  })

  test(`choosing an action runs it and closes, disabled ones do neither`, async () => {
    const actions = make_actions()
    await open_menu(actions)

    items()[1].click() // disabled
    await tick()
    expect(actions[1].action).not.toHaveBeenCalled()
    expect(menu()).not.toBeNull()

    items()[0].click()
    await tick()
    expect(actions[0].action).toHaveBeenCalledWith(`Copy`)
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
