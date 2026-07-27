import { Nav } from '$lib'
import type { NavRoute, NavRouteObject } from '$lib/types'
import { type ComponentProps, mount, tick } from 'svelte'
import { afterEach, assert, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'
import TestSnippetHarness from './TestSnippetHarness.svelte'

vi.mock(`$app/state`, () => ({ page: { url: { pathname: `/` } } }))

describe(`Nav`, () => {
  const default_routes = [`/`, `/about`, `/contact`]
  const single_dropdown_route: NavRoute[] = [[`/parent`, [`/parent`, `/parent/child`]]]
  const two_dropdown_routes: NavRoute[] = [
    [`/first`, [`/first`, `/first/child`]],
    [`/second`, [`/second`, `/second/child`]],
  ]
  const parent_other: NavRoute[] = [...single_dropdown_route, [`/other`, [`/other`]]]
  const mount_nav = (props: ComponentProps<typeof Nav>) =>
    mount(Nav, { target: document.body, props })
  const click = (el?: Element | null) => {
    el?.dispatchEvent(new MouseEvent(`click`, { bubbles: true, cancelable: true }))
    return tick()
  }
  const keydown = (key: string, target: EventTarget = globalThis) =>
    target.dispatchEvent(new KeyboardEvent(`keydown`, { key, bubbles: true }))
  const escape = async () => {
    keydown(`Escape`)
    await tick()
  }
  const mouse_enter = (el?: Element | null) =>
    el?.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
  const mouse_leave = (el?: Element | null) =>
    el?.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
  const focus_in = (el: Element) =>
    el.dispatchEvent(new FocusEvent(`focusin`, { bubbles: true }))
  const focus_out = (el: Element, relatedTarget: EventTarget | null) =>
    el.dispatchEvent(new FocusEvent(`focusout`, { bubbles: true, relatedTarget }))
  // the attachment dismisses on the press, not the click
  const click_outside = async () => {
    const outside = document.createElement(`div`)
    document.body.append(outside)
    outside.dispatchEvent(new PointerEvent(`pointerdown`, { bubbles: true }))
    await tick()
    outside.remove()
  }
  // flush a macrotask (focus moves inside setTimeout(..., 0) in the component)
  const next_task = () => new Promise((resolve) => setTimeout(resolve, 0))
  const set_window_width = (width: number) =>
    Object.defineProperty(globalThis, `innerWidth`, { value: width, writable: true })
  afterEach(() => set_window_width(1024)) // reset any per-test viewport override
  const is_visible = (element: Element) => element.classList.contains(`visible`)
  const query_dropdown_elements = () => {
    const dropdown = doc_query(`.dropdown`)
    const dropdown_menu = dropdown.querySelector<HTMLElement>(`[data-submenu]`)
    assert(dropdown_menu !== null, `No dropdown menu found`)
    return { dropdown, dropdown_menu }
  }
  // all dropdowns with their submenus (for multi-dropdown tests)
  const query_all_dropdowns = () =>
    [...document.querySelectorAll(`.dropdown`)].map((dropdown) => {
      const menu = dropdown.querySelector<HTMLElement>(`[data-submenu]`)
      assert(menu !== null, `No dropdown menu found`)
      return { dropdown, menu }
    })

  test(`burger menu has accessible structure and closes on Escape or link click`, async () => {
    const link_props = { onclick: vi.fn() }
    // stopPropagation keeps Escape from reaching <svelte:window>, so the menu can only
    // still close if menu_props.onkeydown is chained on the .menu element itself
    const menu_props = {
      onkeydown: vi.fn((event: KeyboardEvent) => event.stopPropagation()),
    }
    mount_nav({ routes: default_routes, link_props, menu_props })
    const button = doc_query(`.burger`)
    const menu = doc_query(`.menu`)
    const panel_id = button.getAttribute(`aria-controls`)

    expect(button.tagName).toBe(`BUTTON`)
    expect(button.getAttribute(`aria-label`)).toBe(`Toggle navigation menu`)
    expect(button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(button.querySelectorAll(`span`)).toHaveLength(3)
    expect(panel_id).toBeTypeOf(`string`)
    expect(menu.id).toBe(panel_id)
    expect(panel_id?.startsWith(`nav-menu-`)).toBe(true)
    expect(menu.getAttribute(`role`)).toBeNull()
    expect(menu.getAttribute(`tabindex`)).toBeNull()
    expect(menu.classList.contains(`open`)).toBe(false)

    await click(button)
    expect(button.getAttribute(`aria-expanded`)).toBe(`true`)
    expect(menu.classList.contains(`open`)).toBe(true)

    keydown(`Escape`, menu)
    await tick()
    expect(button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(menu.classList.contains(`open`)).toBe(false)
    expect(menu_props.onkeydown).toHaveBeenCalledOnce()

    await click(button)
    await click(doc_query(`a`))
    expect(button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(link_props.onclick).toHaveBeenCalledOnce()
  })

  test(`applies custom props`, () => {
    mount_nav({
      routes: default_routes,
      class: `custom-class`,
      menu_props: { style: `background: red;` },
    })
    const nav = doc_query(`nav`)
    const menu = doc_query(`.menu`)
    expect(nav.classList.contains(`custom-class`)).toBe(true)
    expect(menu.getAttribute(`style`)).toBe(`background: red;`)
  })

  test.each([
    [
      `tuple routes with custom labels`,
      [
        [`/`, `Home`],
        [`/about`, `About Us`],
        [`/contact`, `Get In Touch`],
      ] satisfies NavRoute[],
      [`Home`, `About Us`, `Get In Touch`],
    ],
    [
      `mixed routes`,
      [`/`, [`/about`, `About Page`], `/contact`] satisfies NavRoute[],
      [`Home`, `About Page`, `contact`],
    ],
    [`empty routes`, [], []],
    [`HTML labels`, [[`/home`, `<strong>Home</strong>`]] satisfies NavRoute[], [`Home`]],
    [
      `special chars`,
      [`/path?query=test`, `/path#anchor`],
      [`path?query=test`, `path#anchor`],
    ],
  ])(`handles %s`, (_desc, routes, expected_content) => {
    mount_nav({ routes })
    const links = document.querySelectorAll(`a`)
    expect(links).toHaveLength(expected_content.length)
    expect(Array.from(links).map((link) => link.textContent?.trim())).toEqual(
      expected_content,
    )
  })

  test.each([
    // String routes
    [`/about`, `/about`, `page`],
    [`/about/team`, `/about`, `page`],
    [`/contact`, `/about`, null],
    [`/`, `/`, `page`],
    [`/home`, `/`, null],
    // Partial path matching edge cases
    [`/some-page-v2`, `/some-page`, null],
    [`/some-page-v2`, `/some-page-v2`, `page`],
    [`/some-page`, `/some-page-v2`, null],
    [`/some-page/sub`, `/some-page`, `page`],
  ])(`aria-current: pathname=%s link=%s -> %s`, (pathname, link_href, expected) => {
    mount_nav({ routes: [link_href], page: { url: { pathname } } })
    expect(doc_query(`a[href="${link_href}"]`).getAttribute(`aria-current`)).toBe(
      expected,
    )
  })

  test(`click outside closes burger menu and dropdowns, inside click does not`, async () => {
    mount_nav({ routes: single_dropdown_route })
    const burger_button = doc_query(`.burger`)
    const toggle_button = doc_query(`[data-dropdown-toggle]`)
    const { dropdown_menu } = query_dropdown_elements()

    // Open burger menu and dropdown
    await click(burger_button)
    await click(toggle_button)
    expect(burger_button.getAttribute(`aria-expanded`)).toBe(`true`)
    expect(is_visible(dropdown_menu)).toBe(true)

    // Click inside the menu should not close it
    await click(doc_query(`.menu`))
    expect(burger_button.getAttribute(`aria-expanded`)).toBe(`true`)

    // Click outside should close both
    await click_outside()
    expect(burger_button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(is_visible(dropdown_menu)).toBe(false)
  })

  // hovering the trigger and hovering the open panel exercise separate handlers
  // (toggle-button clicks are covered by `click toggles pinned state and aria-expanded`)
  test.each([
    [`dropdown trigger`, (dropdown: Element, _menu: Element) => dropdown],
    [`menu panel`, (_dropdown: Element, menu: Element) => menu],
  ])(`dropdown opens/closes via mouse hover on %s`, async (_desc, get_target) => {
    vi.useFakeTimers()
    mount_nav({ routes: single_dropdown_route })
    const { dropdown, dropdown_menu } = query_dropdown_elements()
    const target = get_target(dropdown, dropdown_menu)
    expect(is_visible(dropdown_menu)).toBe(false)

    mouse_enter(target)
    await tick()
    expect(is_visible(dropdown_menu)).toBe(true)

    mouse_leave(target)
    await vi.advanceTimersByTimeAsync(200) // wait for dropdown_cooldown
    expect(is_visible(dropdown_menu)).toBe(false)
    vi.useRealTimers()
  })

  test(`parent link and toggle button work independently`, async () => {
    mount_nav({ routes: [[`/p`, [`/p`, `/p/c`]]] })
    const { dropdown, dropdown_menu } = query_dropdown_elements()
    const parent_link = dropdown.querySelector<HTMLElement>(`div:first-child > a`)
    const toggle = doc_query(`[data-dropdown-toggle]`)

    await click(parent_link)
    expect(is_visible(dropdown_menu)).toBe(false)

    await click(toggle)
    expect(is_visible(dropdown_menu)).toBe(true)

    await click(toggle)
    expect(is_visible(dropdown_menu)).toBe(false)
  })

  test.each([
    [`/plot-color-bar`, `plot color bar`, undefined],
    [`/`, `Home`, undefined],
    [
      `/hook-up-to-api`,
      `Hook up to external API`,
      {
        '/hook-up-to-api': `Hook up to external API`,
      },
    ],
  ])(`format_label: %s -> "%s"`, (route, expected, labels) => {
    mount_nav({ routes: [route], labels })
    const link = doc_query(`a[href="${route}"]`)
    expect(link.textContent?.trim()).toBe(expected)
    // Test inline style since format_label intentionally sets text-transform
    expect(link.getAttribute(`style`)).toBe(labels ? `` : `text-transform: capitalize;`)
  })

  test.each<[string, NavRoute[], string, string | null, string, string[]]>([
    // [description, routes, expected trigger tag, expected href, expected label, expected children]
    [
      `not a link when parent page does not exist`,
      [[`/how-to`, [`/how-to/guide-1`, `/how-to/guide-2`]]],
      `SPAN`,
      null,
      `how to`,
      [`/how-to/guide-1`, `/how-to/guide-2`],
    ],
    [
      `a link when parent page exists`,
      [[`/docs`, [`/docs`, `/docs/intro`, `/docs/api`]]],
      `A`,
      `/docs`,
      `docs`,
      [`/docs/intro`, `/docs/api`],
    ],
  ])(`dropdown trigger is %s`, (_desc, routes, tag, href, label, children) => {
    mount_nav({ routes })
    const dropdown = doc_query(`.dropdown`)
    const selector = tag === `A` ? `div:first-child > a` : `div:first-child > span`
    const trigger = dropdown.querySelector(selector)
    assert(trigger !== null, `No dropdown trigger found`)
    expect(trigger.tagName).toBe(tag)
    expect(trigger.getAttribute(`href`)).toBe(href)
    expect(trigger.textContent?.trim()).toBe(label)
    const menu_links = Array.from(
      doc_query(`.dropdown [data-submenu]`).querySelectorAll(`a`),
    ).map((link) => link.getAttribute(`href`))
    expect(menu_links).toEqual(children)
  })

  test(`dropdown accessibility and state management`, async () => {
    mount_nav({ routes: parent_other, page: { url: { pathname: `/parent/child` } } })

    const [{ dropdown: dropdown1, menu: menu1 }, { dropdown: dropdown2, menu: menu2 }] =
      query_all_dropdowns()
    const toggle1 = dropdown1.querySelector<HTMLElement>(`[data-dropdown-toggle]`)
    const toggle2 = dropdown2.querySelector<HTMLElement>(`[data-dropdown-toggle]`)
    assert(toggle1 !== null && toggle2 !== null, `No dropdown toggle found`)

    // aria-controls linkage is not implemented for dropdowns (only for the burger menu)
    expect(toggle1.getAttribute(`aria-expanded`)).toBe(`false`)
    await click(toggle1)
    expect(toggle1.getAttribute(`aria-expanded`)).toBe(`true`)
    expect(is_visible(menu1)).toBe(true)

    await escape()
    expect(is_visible(menu1)).toBe(false)

    // dropdowns are mutually exclusive: opening the second closes the first
    await click(toggle1)
    expect([is_visible(menu1), is_visible(menu2)]).toEqual([true, false])
    await click(toggle2)
    expect([is_visible(menu1), is_visible(menu2)]).toEqual([false, true])

    // aria-current applied to parent link and dropdown child
    const parent_link = dropdown1.querySelector(`div:first-child > a`)
    expect(parent_link?.getAttribute(`aria-current`)).toBe(`page`)
    expect(menu1.querySelectorAll(`a`)[0].getAttribute(`aria-current`)).toBe(`page`)
  })

  test(`keyboard navigation: Enter/Space/ArrowDown open, arrows navigate, Escape closes`, async () => {
    const link_props = { onkeydown: vi.fn() }
    mount_nav({ routes: [[`/p`, [`/p`, `/p/1`, `/p/2`]]], link_props })
    const toggle_button = doc_query(`[data-dropdown-toggle]`)
    const { dropdown_menu: menu } = query_dropdown_elements()

    // Enter/Space/ArrowDown all open and focus first item
    for (const open_key of [`Enter`, ` `, `ArrowDown`]) {
      keydown(open_key, toggle_button)
      // deno-lint-ignore no-await-in-loop
      await next_task() // wait for DOM focus
      expect(is_visible(menu)).toBe(true)
      expect(document.activeElement).toBe(menu.querySelector(`a`))
      keydown(`Escape`)
    }

    // Arrow navigation
    const [item1, item2] = Array.from(menu.querySelectorAll(`a`))
    keydown(`Enter`, toggle_button)
    await next_task()
    expect(document.activeElement).toBe(item1)
    keydown(`ArrowDown`, toggle_button)
    expect(document.activeElement).toBe(item2)
    keydown(`ArrowDown`, toggle_button)
    expect(document.activeElement).toBe(item2) // stays at end
    keydown(`ArrowUp`, toggle_button)
    expect(document.activeElement).toBe(item1)

    // Escape from item returns focus to toggle button
    keydown(`Escape`, item1)
    await next_task()
    expect(is_visible(menu)).toBe(false)
    expect(document.activeElement).toBe(toggle_button)
    expect(link_props.onkeydown).toHaveBeenCalledOnce()
  })

  test(`dropdown focus behavior`, async () => {
    mount_nav({ routes: [[`/p`, [`/p`, `/p/1`]]] })
    const { dropdown, dropdown_menu: menu } = query_dropdown_elements()

    focus_in(dropdown)
    await tick()
    expect(is_visible(menu)).toBe(true)

    const external = document.createElement(`button`)
    document.body.append(external)
    focus_out(dropdown, external)
    await tick()
    expect(is_visible(menu)).toBe(false)
    external.remove()
  })

  test.each([
    [`/parent/child`, true],
    [`/parent`, true],
    [`/other`, false],
  ])(`dropdown active state: pathname=%s -> active=%s`, (pathname, is_active) => {
    mount_nav({ routes: parent_other, page: { url: { pathname } } })

    const [{ dropdown: dropdown1 }, { dropdown: dropdown2 }] = query_all_dropdowns()
    expect(dropdown1.classList.contains(`active`)).toBe(is_active)
    expect(dropdown2.classList.contains(`active`)).toBe(
      !is_active && pathname === `/other`,
    )
  })

  test(`item, link, and children snippets receive route and menu state`, async () => {
    const page = { url: { pathname: `/about` } }
    mount(TestSnippetHarness, {
      target: document.body,
      props: { component: `nav`, routes: [`/`, `/about`, `/contact`], page },
    })

    const links = [...document.querySelectorAll<HTMLElement>(`[data-testid="nav-link"]`)]
    expect(links).toHaveLength(3)
    expect(
      links.map((link) => [link.getAttribute(`href`), link.dataset.isActive]),
    ).toEqual([
      [`/`, `false`],
      [`/about`, `true`],
      [`/contact`, `false`],
    ])

    const items = [...document.querySelectorAll<HTMLElement>(`[data-testid="nav-item"]`)]
    expect(items).toHaveLength(3)
    expect(items[0].dataset.href).toBe(`/`)
    expect(items[0].dataset.active).toBe(`false`)
    expect(items[0].dataset.dropdown).toBe(`false`)
    expect(items[0].querySelector(`a`)?.getAttribute(`href`)).toBe(`/`)
    expect(items[1].dataset.href).toBe(`/about`)
    expect(items[1].dataset.active).toBe(`true`)
    expect(
      items[1].querySelector<HTMLElement>(`[data-testid="nav-link"]`)?.dataset.isActive,
    ).toBe(`true`)

    const children = doc_query(`[data-testid="nav-children"]`)
    expect(children.dataset.open).toBe(`false`)
    expect(children.dataset.panelId?.startsWith(`nav-menu-`)).toBe(true)
    expect(children.textContent?.trim()).toBe(`3 routes`)

    await click(doc_query(`.burger`))
    expect(children.dataset.open).toBe(`true`)
  })

  test(`dropdown accessibility uses native navigation links and labelled toggles`, () => {
    mount_nav({ routes: [[`/docs`, [`/docs`, `/docs/intro`]]] })

    const { dropdown, dropdown_menu } = query_dropdown_elements()
    const links = [...dropdown_menu.querySelectorAll(`a`)]
    // parent /docs is filtered out of the submenu
    expect(links.map((link) => link.getAttribute(`href`))).toEqual([`/docs/intro`])
    // native <a>/<nav> semantics, no explicit ARIA roles anywhere
    const roles = [dropdown, dropdown_menu, ...links].map((el) => el.getAttribute(`role`))
    expect(roles).toEqual([null, null, null])

    const toggle = doc_query(`[data-dropdown-toggle]`)
    expect([
      toggle.tagName,
      toggle.getAttribute(`aria-label`),
      toggle.getAttribute(`aria-haspopup`),
    ]).toEqual([`BUTTON`, `Toggle docs submenu`, `true`])
  })

  test(`renders object routes with href, label, class, and style`, () => {
    const routes: NavRoute[] = [
      { href: `/home`, label: `Home Page` },
      { href: `/about` },
      { href: `/styled`, class: `custom-nav-item`, style: `color: red` },
    ]
    mount_nav({ routes })
    const links = [...document.querySelectorAll(`a`)]
    expect(
      links.map((link) => [link.getAttribute(`href`), link.textContent?.trim()]),
    ).toEqual([
      [`/home`, `Home Page`],
      [`/about`, `about`],
      [`/styled`, `styled`],
    ])
    expect(links[2].classList.contains(`custom-nav-item`)).toBe(true)
    expect(links[2].getAttribute(`style`)).toContain(`color: red`)
  })

  test(`renders dropdown object route with trigger label, class, and children`, () => {
    const routes: NavRoute[] = [
      {
        href: `/docs`,
        label: `Documentation`,
        children: [`/docs/intro`, `/docs/api`],
        class: `docs-menu`,
      },
    ]
    mount_nav({ routes })
    const trigger = doc_query(`.dropdown span`)
    expect(trigger.textContent?.trim()).toBe(`Documentation`)
    expect(trigger.classList.contains(`docs-menu`)).toBe(true)
    const submenu_links = doc_query(`.dropdown`).querySelectorAll(`[data-submenu] a`)
    expect([...submenu_links].map((link) => link.getAttribute(`href`))).toEqual([
      `/docs/intro`,
      `/docs/api`,
    ])
  })

  describe(`disabled routes`, () => {
    test.each<[string, NavRoute, string]>([
      [`boolean true`, { href: `/page`, disabled: true }, `page`],
      [`string message`, { href: `/page`, disabled: `Not available` }, `page`],
      [
        `with custom label`,
        { href: `/admin`, label: `Admin Panel`, disabled: true },
        `Admin Panel`,
      ],
      [
        `preserves formatting`,
        { href: `/my-disabled-page`, disabled: true },
        `my disabled page`,
      ],
    ])(`disabled item with %s`, (_desc, route, expected_text) => {
      mount_nav({ routes: [route] })
      const disabled = doc_query(`.disabled`)
      expect(disabled.getAttribute(`aria-disabled`)).toBe(`true`)
      expect(disabled.textContent?.trim()).toBe(expected_text)
    })

    test(`disabled items apply custom class and style`, () => {
      const routes: NavRoute[] = [
        { href: `/test`, disabled: true, class: `my-disabled`, style: `opacity: 0.3` },
      ]
      mount_nav({ routes })
      const disabled = doc_query(`.disabled`)
      expect(disabled.classList.contains(`my-disabled`)).toBe(true)
      expect(disabled.getAttribute(`style`)).toContain(`opacity: 0.3`)
    })

    test(`clicking disabled item does not trigger onnavigate`, async () => {
      const on_navigate = vi.fn()
      const routes: NavRoute[] = [
        { href: `/home` },
        { href: `/disabled`, disabled: true },
        { href: `/disabled2`, disabled: `Coming soon` },
      ]
      mount_nav({ routes, onnavigate: on_navigate })
      await click(doc_query(`.disabled`))
      expect(on_navigate).not.toHaveBeenCalled()
      expect(document.querySelectorAll(`a`)).toHaveLength(1)
      expect(document.querySelectorAll(`.disabled`)).toHaveLength(2)
    })

    test(`disabled dropdown parent renders as span, not link`, () => {
      const routes: NavRoute[] = [
        { href: `/docs`, children: [`/docs`, `/docs/intro`], disabled: true },
      ]
      mount_nav({ routes })
      const dropdown = doc_query(`.dropdown`)
      const parent_span = dropdown.querySelector(`div:first-child > span.disabled`)
      expect(parent_span?.getAttribute(`aria-disabled`)).toBe(`true`)
      expect(dropdown.querySelector(`div:first-child > a`)).toBeNull() // no parent link
      // dropdown children stay accessible
      expect(
        dropdown.querySelector(`div:last-child`)?.querySelectorAll(`a`),
      ).toHaveLength(1)
    })
  })

  describe(`separators`, () => {
    test.each<[string, NavRoute[], { separators: number; links: number }]>([
      [
        `standalone separators`,
        [
          { href: `/home` },
          { separator: true },
          { href: `/about` },
          { separator: true },
          { href: `/contact` },
        ],
        { separators: 2, links: 3 },
      ],
      [
        `separator after items`,
        [
          { href: `/home`, separator: true },
          { href: `/about`, separator: true },
          { href: `/contact` },
        ],
        { separators: 2, links: 3 },
      ],
      [
        `separator-only items`,
        [{ separator: true }, { separator: true }, { separator: true }],
        { separators: 3, links: 0 },
      ],
      [
        `separators at start and end`,
        [{ separator: true }, { href: `/home` }, { separator: true }],
        { separators: 2, links: 1 },
      ],
    ])(`%s`, (_desc, routes, expected) => {
      mount_nav({ routes })
      const separators = document.querySelectorAll(`.separator`)
      expect(separators).toHaveLength(expected.separators)
      separators.forEach((sep) => expect(sep.getAttribute(`role`)).toBe(`separator`))
      expect(document.querySelectorAll(`a`)).toHaveLength(expected.links)
    })

    test(`separator after dropdown`, () => {
      const routes: NavRoute[] = [
        { href: `/docs`, children: [`/docs/intro`], separator: true },
        { href: `/contact` },
      ]
      mount_nav({ routes })
      const separators = document.querySelectorAll(`.separator`)
      expect(separators).toHaveLength(1)
      // must sit between the dropdown and the item following it, not just exist
      expect(separators[0].previousElementSibling).toBe(doc_query(`.dropdown`))
      expect(separators[0].nextElementSibling?.querySelector(`a`)?.href).toContain(
        `/contact`,
      )
    })
  })

  test(`external links have target attrs and trigger onnavigate callback`, async () => {
    const on_navigate = vi.fn()
    const routes: NavRoute[] = [
      { href: `/internal` },
      { href: `https://github.com`, external: true },
      {
        href: `https://example.com`,
        external: true,
        class: `ext`,
        style: `color: blue`,
        label: `Link`,
      },
    ]
    mount_nav({ routes, onnavigate: on_navigate })
    const links = document.querySelectorAll(`a`)
    // internal link gets no target/rel, external ones do
    expect([0, 1, 2].map((idx) => links[idx].getAttribute(`target`))).toEqual([
      null,
      `_blank`,
      `_blank`,
    ])
    expect(links[0].getAttribute(`rel`)).toBeNull()
    expect(links[1].getAttribute(`rel`)).toBe(`noopener noreferrer`)
    // external link with custom props
    expect(links[2].textContent?.trim()).toBe(`Link`)
    expect(links[2].classList.contains(`ext`)).toBe(true)
    expect(links[2].getAttribute(`style`)).toContain(`color: blue`)
    await click(links[1])
    expect(on_navigate).toHaveBeenCalledWith(
      expect.objectContaining({ route: expect.objectContaining({ external: true }) }),
    )
  })

  test(`right-aligned items and dropdowns`, () => {
    const routes: NavRoute[] = [
      { href: `/home` },
      {
        href: `/settings`,
        align: `right`,
        class: `settings-link`,
        style: `font-weight: bold`,
      },
      { href: `/user`, children: [`/user/profile`], align: `right` },
    ]
    mount_nav({ routes })
    expect(document.querySelectorAll(`.align-right`)).toHaveLength(2)
    expect(doc_query(`.dropdown`).classList.contains(`align-right`)).toBe(true)
    const link = doc_query(`.align-right a`)
    expect(link.classList.contains(`settings-link`)).toBe(true)
    expect(link.getAttribute(`style`)).toContain(`font-weight: bold`)
  })

  describe(`callbacks`, () => {
    test(`onnavigate called with href, event, and route`, async () => {
      const on_navigate = vi.fn()
      const routes = [{ href: `/home`, icon: `gear`, count: 42 }]
      mount_nav({ routes, onnavigate: on_navigate })
      await click(doc_query(`a`))
      expect(on_navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          href: `/home`,
          event: expect.any(MouseEvent),
          route: expect.objectContaining({ href: `/home`, icon: `gear`, count: 42 }),
        }),
      )
    })

    test(`onnavigate returning false prevents default`, async () => {
      const on_navigate = vi.fn((): false => false)
      mount_nav({ routes: [`/home`], onnavigate: on_navigate })
      const event = new MouseEvent(`click`, { bubbles: true, cancelable: true })
      doc_query(`a`).dispatchEvent(event)
      await tick()
      expect(event.defaultPrevented).toBe(true)
    })

    test(`onnavigate called for multiple clicks and dropdown children`, async () => {
      const on_navigate = vi.fn()
      const routes: NavRoute[] = [
        `/a`,
        `/b`,
        {
          href: `/docs`,
          children: [`/docs`, `/docs/intro`],
        },
      ]
      mount_nav({ routes, onnavigate: on_navigate })

      await click(doc_query(`a[href="/a"]`))
      await click(doc_query(`a[href="/b"]`))
      await click(doc_query(`[data-dropdown-toggle]`))
      await click(doc_query(`a[href="/docs/intro"]`))

      expect(on_navigate).toHaveBeenCalledTimes(3)
      expect(on_navigate).toHaveBeenLastCalledWith(
        expect.objectContaining({ href: `/docs/intro` }),
      )
    })

    test(`onopen and onclose callbacks on menu toggle`, async () => {
      const on_open = vi.fn()
      const on_close = vi.fn()
      set_window_width(500)

      mount_nav({
        routes: [`/home`],
        onopen: on_open,
        onclose: on_close,
        breakpoint: 767,
      })
      await tick()
      const burger = doc_query(`.burger`)

      await click(burger)
      await tick()
      expect(on_open).toHaveBeenCalledTimes(1)

      await click(burger)
      await tick()
      expect(on_close).toHaveBeenCalledTimes(1)
    })

    test.each([
      [`clicking link`, () => click(doc_query(`a`))],
      [`pressing Escape`, escape],
    ])(`onclose called when %s closes menu`, async (_desc, close_action) => {
      const on_close = vi.fn()
      set_window_width(500)

      mount_nav({ routes: [`/home`], onclose: on_close, breakpoint: 767 })
      await tick()
      await click(doc_query(`.burger`))
      await tick()
      await close_action()
      await tick()
      expect(on_close).toHaveBeenCalledTimes(1)
      expect(doc_query(`.burger`).getAttribute(`aria-expanded`)).toBe(`false`)
    })
  })

  describe(`breakpoint prop`, () => {
    test.each([
      [`below breakpoint`, 500, 600, true],
      [`above breakpoint`, 800, 600, false],
      [`at exact breakpoint`, 600, 600, true],
      [`default breakpoint 767`, 766, undefined, true],
      [`breakpoint 0 = always desktop`, 1, 0, false],
      [`large breakpoint = always mobile`, 2000, 3000, true],
    ])(
      `%s: width=%d, breakpoint=%s -> mobile=%s`,
      async (_desc, width, breakpoint, expected_mobile) => {
        set_window_width(width)
        mount_nav({ routes: [`/home`], ...(breakpoint !== undefined && { breakpoint }) })
        await tick()
        expect(doc_query(`nav`).classList.contains(`mobile`)).toBe(expected_mobile)
      },
    )

    test(`re-evaluates mobile mode when the window resizes`, async () => {
      mount_nav({ routes: [`/home`] })
      await tick()
      set_window_width(500)
      globalThis.dispatchEvent(new Event(`resize`))
      await tick()
      expect(doc_query(`nav`).classList.contains(`mobile`)).toBe(true)
    })
  })

  test(`handles all route formats together with all features`, () => {
    const routes: NavRoute[] = [
      `/simple`,
      [`/tuple`, `Tuple Label`],
      { separator: true },
      [`/docs`, [`/docs`, `/docs/api`]],
      { href: `/object`, label: `Object Label` },
      { href: `/disabled`, disabled: `Login required` },
      { href: `/settings`, align: `right` },
      { href: `https://github.com`, external: true, align: `right` },
    ]
    mount_nav({ routes })
    const links = document.querySelectorAll(`a`)
    // route order preserved, dropdown parent link precedes its submenu link
    expect([...links].map((link) => link.getAttribute(`href`)).join(` `)).toBe(
      `/simple /tuple /docs /docs/api /object /settings https://github.com`,
    )
    expect(document.querySelectorAll(`.separator`)).toHaveLength(1)
    expect(document.querySelectorAll(`.disabled`)).toHaveLength(1)
    expect(document.querySelectorAll(`.align-right`)).toHaveLength(2)
    expect(document.querySelectorAll(`.dropdown`)).toHaveLength(1)
  })

  describe(`pinned dropdown feature`, () => {
    test(`click toggles pinned state and aria-expanded`, async () => {
      // cooldown 0 so an unpinned dropdown would hide within one macrotask
      mount_nav({ routes: single_dropdown_route, dropdown_cooldown: 0 })
      const { dropdown, dropdown_menu } = query_dropdown_elements()
      const toggle = doc_query(`[data-dropdown-toggle]`)

      expect(is_visible(dropdown_menu)).toBe(false)
      expect(toggle.getAttribute(`aria-expanded`)).toBe(`false`)

      await click(toggle) // pin open
      expect(is_visible(dropdown_menu)).toBe(true)
      expect(toggle.getAttribute(`aria-expanded`)).toBe(`true`)

      mouse_leave(dropdown) // stays open when pinned
      await next_task()
      expect(is_visible(dropdown_menu)).toBe(true)
      expect(toggle.getAttribute(`aria-expanded`)).toBe(`true`)

      await click(toggle) // unpin
      expect(is_visible(dropdown_menu)).toBe(false)
      expect(toggle.getAttribute(`aria-expanded`)).toBe(`false`)
    })

    describe(`dropdown_cooldown`, () => {
      beforeEach(() => vi.useFakeTimers())
      afterEach(() => vi.useRealTimers())

      test.each([0, 100])(`cooldown=%dms closes after timeout`, async (cooldown) => {
        mount_nav({ routes: single_dropdown_route, dropdown_cooldown: cooldown })
        const { dropdown, dropdown_menu } = query_dropdown_elements()

        mouse_enter(dropdown)
        await tick()
        expect(is_visible(dropdown_menu)).toBe(true)

        mouse_leave(dropdown)
        if (cooldown > 0) {
          await vi.advanceTimersByTimeAsync(cooldown - 1)
          expect(is_visible(dropdown_menu)).toBe(true)
        }
        await vi.advanceTimersByTimeAsync(1)
        expect(is_visible(dropdown_menu)).toBe(false)
      })

      test(`multiple rapid enter/leave cycles reset cooldown each time`, async () => {
        mount_nav({ routes: single_dropdown_route, dropdown_cooldown: 100 })
        const { dropdown, dropdown_menu } = query_dropdown_elements()

        for (let idx = 0; idx < 3; idx++) {
          mouse_enter(dropdown)
          // deno-lint-ignore no-await-in-loop
          await tick()
          mouse_leave(dropdown)
          // deno-lint-ignore no-await-in-loop
          await vi.advanceTimersByTimeAsync(50)
          expect(is_visible(dropdown_menu)).toBe(true)
        }
        await vi.advanceTimersByTimeAsync(51)
        expect(is_visible(dropdown_menu)).toBe(false)
      })

      test.each([
        [`re-entering menu`, (_dropdown: Element, menu: Element) => mouse_enter(menu)],
        [`keyboard focus`, (dropdown: Element) => focus_in(dropdown)],
      ])(`%s during cooldown cancels hide`, async (_desc, reinteract) => {
        mount_nav({ routes: single_dropdown_route, dropdown_cooldown: 150 })
        const { dropdown, dropdown_menu } = query_dropdown_elements()

        mouse_enter(dropdown)
        await tick()
        mouse_leave(dropdown)
        await vi.advanceTimersByTimeAsync(50)

        reinteract(dropdown, dropdown_menu)
        await vi.advanceTimersByTimeAsync(200)
        expect(is_visible(dropdown_menu)).toBe(true)
      })

      test(`pinned dropdown ignores cooldown on mouseleave`, async () => {
        mount_nav({ routes: single_dropdown_route, dropdown_cooldown: 150 })
        const { dropdown, dropdown_menu } = query_dropdown_elements()
        const toggle = dropdown.querySelector<HTMLElement>(`[data-dropdown-toggle]`)

        await click(toggle)
        expect(is_visible(dropdown_menu)).toBe(true)

        mouse_leave(dropdown)
        await vi.advanceTimersByTimeAsync(500)
        expect(is_visible(dropdown_menu)).toBe(true)
      })

      test(`switching between multiple dropdowns respects cooldown`, async () => {
        mount_nav({ routes: two_dropdown_routes, dropdown_cooldown: 100 })
        const [
          { dropdown: dropdown1, menu: menu1 },
          { dropdown: dropdown2, menu: menu2 },
        ] = query_all_dropdowns()

        mouse_enter(dropdown1)
        await tick()
        expect(is_visible(menu1)).toBe(true)

        mouse_leave(dropdown1)
        await vi.advanceTimersByTimeAsync(30)
        mouse_enter(dropdown2)
        await tick()

        expect([is_visible(menu2), is_visible(menu1)]).toEqual([true, false]) // switches at once

        // dropdown1's pending hide must not take dropdown2 down with it
        await vi.advanceTimersByTimeAsync(100)
        expect([is_visible(menu2), is_visible(menu1)]).toEqual([true, false])

        mouse_leave(dropdown2) // leaving starts a fresh full cooldown
        await vi.advanceTimersByTimeAsync(99)
        expect(is_visible(menu2)).toBe(true)
        await vi.advanceTimersByTimeAsync(1)
        expect(is_visible(menu2)).toBe(false)
      })
    })

    test.each([
      [`click outside`, click_outside],
      [
        `child route click`,
        async (menu: HTMLElement) => {
          await click(menu.querySelector<HTMLElement>(`a`))
        },
      ],
      [`Escape key`, escape],
    ])(`pinned dropdown closes on %s`, async (_trigger, close_action) => {
      mount_nav({ routes: single_dropdown_route })
      const { dropdown_menu } = query_dropdown_elements()
      await click(doc_query(`[data-dropdown-toggle]`))
      expect(is_visible(dropdown_menu)).toBe(true)
      await close_action(dropdown_menu)
      expect(is_visible(dropdown_menu)).toBe(false)
    })

    test.each([
      [`hover`, (dropdown: Element) => mouse_enter(dropdown)],
      [`focus`, (dropdown: Element) => focus_in(dropdown)],
      [
        `click toggle`,
        (dropdown: Element) => click(dropdown.querySelector(`[data-dropdown-toggle]`)),
      ],
    ])(`%s on different dropdown closes pinned dropdown`, async (_method, activate) => {
      mount_nav({ routes: two_dropdown_routes })
      const [{ dropdown: dropdown1, menu: menu1 }, { dropdown: dropdown2, menu: menu2 }] =
        query_all_dropdowns()

      await click(dropdown1.querySelector(`[data-dropdown-toggle]`))
      expect(is_visible(menu1)).toBe(true)

      await activate(dropdown2)
      await tick()
      expect(is_visible(menu1)).toBe(false)
      expect(is_visible(menu2)).toBe(true)
    })

    test.each([`Enter`, ` `, `ArrowDown`])(
      `keyboard %s pins dropdown open`,
      async (key) => {
        mount_nav({ routes: single_dropdown_route, dropdown_cooldown: 0 })
        const { dropdown, dropdown_menu } = query_dropdown_elements()
        const toggle = doc_query(`[data-dropdown-toggle]`)

        keydown(key, toggle)
        await next_task()
        expect(is_visible(dropdown_menu)).toBe(true)
        expect(toggle.getAttribute(`aria-expanded`)).toBe(`true`)

        mouse_leave(dropdown)
        await next_task()
        expect(is_visible(dropdown_menu)).toBe(true)
      },
    )

    test(`ArrowDown navigates within pinned dropdown after mouse leave`, async () => {
      const routes: NavRoute[] = [[`/p`, [`/p`, `/p/child1`, `/p/child2`]]]
      mount_nav({ routes, dropdown_cooldown: 0 })
      const { dropdown, dropdown_menu } = query_dropdown_elements()
      const toggle = doc_query(`[data-dropdown-toggle]`)

      await click(toggle) // pin open, then leave with the mouse
      expect(is_visible(dropdown_menu)).toBe(true)
      mouse_leave(dropdown)
      await next_task()
      expect(is_visible(dropdown_menu)).toBe(true)

      // ArrowDown navigates within the dropdown instead of closing it. toggle_dropdown
      // focuses the first item in a setTimeout(..., 0), so flush a macrotask.
      keydown(`ArrowDown`, toggle)
      await next_task()
      expect(is_visible(dropdown_menu)).toBe(true)
      expect(document.activeElement).toBe(dropdown_menu.querySelector(`a`))
    })

    test(`pinned dropdown stays open on focus out`, async () => {
      mount_nav({ routes: [[`/p`, [`/p`, `/p/child1`, `/p/child2`]]] })
      const { dropdown, dropdown_menu } = query_dropdown_elements()

      await click(doc_query(`[data-dropdown-toggle]`))
      expect(is_visible(dropdown_menu)).toBe(true)

      // stays open whether focus moves inside the dropdown or out of it entirely
      // (pinned dropdowns close via click outside / Escape, not focusout)
      for (const related of [
        dropdown_menu.querySelector(`a`),
        document.createElement(`button`),
      ]) {
        focus_out(dropdown, related)
        // deno-lint-ignore no-await-in-loop
        await tick()
        expect(is_visible(dropdown_menu)).toBe(true)
      }
    })

    test(`pinned state clears when burger menu closes`, async () => {
      set_window_width(500)
      mount_nav({ routes: single_dropdown_route, breakpoint: 767 })
      await tick()

      const burger = doc_query(`.burger`)
      const { dropdown_menu } = query_dropdown_elements()
      const toggle = doc_query(`[data-dropdown-toggle]`)

      await click(burger)
      await click(toggle)
      expect(is_visible(dropdown_menu)).toBe(true)

      await escape()
      expect(burger.getAttribute(`aria-expanded`)).toBe(`false`)
      expect(is_visible(dropdown_menu)).toBe(false)
    })
  })

  // Regression tests: JSON.stringify crashes on BigInt, functions, circular refs
  describe(`non-serializable route properties`, () => {
    const circular_route: NavRoute = { href: `/circular` }
    circular_route.self = circular_route

    test.each<[string, NavRouteObject[]]>([
      [`BigInt`, [{ href: `/a`, custom_id: BigInt(123) }, { href: `/b` }]],
      [`function`, [{ href: `/a`, on_custom: () => {} }, { href: `/b` }]],
      [`circular reference`, [circular_route, { href: `/b` }]],
    ])(`handles routes with %s properties without crashing`, (_desc, routes) => {
      expect(() => mount_nav({ routes })).not.toThrow()
      // hrefs, not just a count: an exotic prop must not derail label/href parsing
      expect(
        [...document.querySelectorAll(`a`)].map((link) => link.getAttribute(`href`)),
      ).toEqual(routes.map((route) => route.href))
    })
  })

  // Regression: dropdown panel mouseleave should not close when mouse moves to trigger
  describe(`dropdown panel mouseleave relatedTarget`, () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    // Open dropdown and enter the panel, returning elements for assertions
    const open_and_enter_panel = async () => {
      mount_nav({ routes: single_dropdown_route, dropdown_cooldown: 50 })
      const { dropdown, dropdown_menu } = query_dropdown_elements()
      mouse_enter(dropdown)
      await tick()
      mouse_enter(dropdown_menu)
      await tick()
      return { dropdown, dropdown_menu }
    }

    test.each([`div:first-child`, `[data-dropdown-toggle]`])(
      `panel stays open when mouse moves to %s within dropdown`,
      async (selector) => {
        const { dropdown, dropdown_menu } = await open_and_enter_panel()
        const related = dropdown.querySelector<HTMLElement>(selector)
        dropdown_menu.dispatchEvent(
          new MouseEvent(`mouseleave`, { relatedTarget: related }),
        )
        await vi.advanceTimersByTimeAsync(200)
        expect(is_visible(dropdown_menu)).toBe(true)
      },
    )

    test.each([
      [`external element`, document.createElement(`div`)],
      [`null (mouse left window)`, null],
    ])(`panel closes when mouse leaves to %s`, async (_desc, related_target) => {
      const { dropdown_menu } = await open_and_enter_panel()
      dropdown_menu.dispatchEvent(
        new MouseEvent(`mouseleave`, { relatedTarget: related_target }),
      )
      await vi.advanceTimersByTimeAsync(100)
      expect(is_visible(dropdown_menu)).toBe(false)
    })

    test(`panel closes when mouse moves to a different dropdown`, async () => {
      mount_nav({ routes: two_dropdown_routes, dropdown_cooldown: 50 })
      const [{ dropdown: dropdown1, menu: menu1 }, { dropdown: dropdown2 }] =
        query_all_dropdowns()
      const other_trigger = dropdown2.querySelector<HTMLElement>(`div:first-child`)

      mouse_enter(dropdown1)
      await tick()
      mouse_enter(menu1)
      await tick()
      menu1.dispatchEvent(new MouseEvent(`mouseleave`, { relatedTarget: other_trigger }))
      await vi.advanceTimersByTimeAsync(100)
      expect(is_visible(menu1)).toBe(false)
    })
  })

  describe(`tooltips`, () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    test.each([
      [
        `tooltips prop keyed by href`,
        [`/about`],
        { '/about': `About the site` },
        `a[href="/about"]`,
        `About the site`,
      ],
      [
        `route.tooltip takes precedence over tooltips prop`,
        [{ href: `/about`, tooltip: `Route tooltip` }],
        { '/about': `Map tooltip` },
        `a[href="/about"]`,
        `Route tooltip`,
      ],
      [
        `string disabled renders as tooltip and beats route.tooltip`,
        [{ href: `/soon`, tooltip: `ignored`, disabled: `Coming soon` }],
        undefined,
        `span.disabled`,
        `Coming soon`,
      ],
    ] as [string, NavRoute[], Record<string, string> | undefined, string, string][])(
      `%s`,
      async (_desc, routes, tooltips, selector, expected_content) => {
        mount_nav({ routes, tooltips })
        await tick() // tooltip attachment is wired up in an effect after mount
        doc_query(selector).dispatchEvent(new MouseEvent(`mouseenter`))
        await vi.advanceTimersByTimeAsync(200) // advance past default 100ms show delay

        expect(
          document.querySelector(`.custom-tooltip .tooltip-content`)?.textContent,
        ).toBe(expected_content)
      },
    )

    test(`shared tooltip_options merge with per-route options taking precedence`, async () => {
      mount_nav({
        routes: [`/docs`],
        tooltips: { '/docs': { content: `Docs tooltip`, delay: 50 } },
        tooltip_options: { delay: 500, placement: `right` },
      })
      await tick() // wait for tooltip attachment to be wired up
      doc_query(`a[href="/docs"]`).dispatchEvent(new MouseEvent(`mouseenter`))

      // per-route delay (50ms) wins over the shared 500ms delay
      await vi.advanceTimersByTimeAsync(49)
      expect(document.querySelector(`.custom-tooltip`)).toBeNull()
      await vi.advanceTimersByTimeAsync(1)
      // placement from shared tooltip_options still applies
      expect(doc_query(`.custom-tooltip`).getAttribute(`data-placement`)).toBe(`right`)
    })
  })

  describe(`touch device guards`, () => {
    afterEach(() => vi.unstubAllGlobals())

    test(`mouse hover does not open dropdowns on mobile touch devices`, async () => {
      vi.stubGlobal(`ontouchstart`, () => {}) // makes 'ontouchstart' in globalThis true
      set_window_width(500)
      mount_nav({ routes: single_dropdown_route })
      await tick()

      const { dropdown, dropdown_menu } = query_dropdown_elements()
      mouse_enter(dropdown)
      await tick()
      expect(is_visible(dropdown_menu)).toBe(false)

      // explicit toggle click still opens the dropdown on touch devices
      await click(doc_query(`[data-dropdown-toggle]`))
      expect(is_visible(dropdown_menu)).toBe(true)
    })

    test(`schedule_hide early-returns on touch devices so dropdown survives mouseleave`, async () => {
      vi.useFakeTimers()
      vi.stubGlobal(`ontouchstart`, () => {})
      // desktop width: hover-open is only blocked when touch AND mobile
      mount_nav({ routes: single_dropdown_route, dropdown_cooldown: 0 })
      await tick()

      const { dropdown, dropdown_menu } = query_dropdown_elements()
      mouse_enter(dropdown)
      await tick()
      expect(is_visible(dropdown_menu)).toBe(true)

      mouse_leave(dropdown)
      // with cooldown=0 a scheduled hide would fire immediately - the touch guard skips it
      await vi.advanceTimersByTimeAsync(500)
      expect(is_visible(dropdown_menu)).toBe(true)
      vi.useRealTimers()
    })
  })

  test(`CSS custom properties for dropdown are passed to nav element`, () => {
    const css_vars = {
      '--nav-dropdown-min-width': `200px`,
      '--nav-dropdown-max-width': `150px`,
      '--nav-dropdown-width': `250px`,
      '--nav-dropdown-left': `10px`,
      '--nav-dropdown-right': `5px`,
      '--nav-dropdown-margin': `8pt`,
      '--nav-dropdown-padding': `5pt 2pt`,
      '--nav-dropdown-z-index': `999`,
    }
    const style = Object.entries(css_vars)
      .map(([css_var, value]) => `${css_var}: ${value}`)
      .join(`; `)
    mount_nav({ routes: single_dropdown_route, style })
    const nav = doc_query(`nav`)
    for (const [css_var, expected] of Object.entries(css_vars)) {
      expect(nav.style.getPropertyValue(css_var), css_var).toBe(expected)
    }
  })
})
