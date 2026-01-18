import { Nav } from '$lib'
import type { NavRoute } from '$lib/types'
import type { Page } from '@sveltejs/kit'
import { mount, tick } from 'svelte'
import { describe, expect, test, vi } from 'vitest'
import { doc_query } from './index'

vi.mock(`$app/state`, () => ({ page: { url: { pathname: `/` } } }))

describe(`Nav`, () => {
  const default_routes = [`/`, `/about`, `/contact`]
  const click = (el: Element) => {
    el.dispatchEvent(new MouseEvent(`click`, { bubbles: true, cancelable: true }))
  }
  const get_dropdown_elements = () => {
    const dropdown = doc_query(`.dropdown`)
    const dropdown_menu = dropdown.querySelector(`div:last-child`) as HTMLElement
    return { dropdown, dropdown_menu }
  }

  test(`renders simple routes as links`, () => {
    mount(Nav, { target: document.body, props: { routes: default_routes } })
    const links = document.querySelectorAll(`a`)
    expect(links).toHaveLength(3)
    expect(
      Array.from(links).map((link) => link.getAttribute(`href`)),
    ).toEqual([`/`, `/about`, `/contact`])
  })

  test(`renders tuple routes with custom labels`, () => {
    const routes: [string, string][] = [[`/`, `Home`], [`/about`, `About Us`], [
      `/contact`,
      `Get In Touch`,
    ]]
    mount(Nav, { target: document.body, props: { routes } })
    const links = document.querySelectorAll(`a`)
    expect(Array.from(links).map((link) => link.textContent?.trim())).toEqual([
      `Home`,
      `About Us`,
      `Get In Touch`,
    ])
  })

  test(`burger button structure and ARIA`, () => {
    mount(Nav, { target: document.body, props: { routes: default_routes } })
    const burger_button = doc_query(`.burger`)
    expect(burger_button.tagName).toBe(`BUTTON`)
    expect(burger_button.getAttribute(`aria-label`)).toBe(`Toggle navigation menu`)
    expect(burger_button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(burger_button.getAttribute(`aria-controls`)).toBeTruthy()
    expect(burger_button.querySelectorAll(`span`)).toHaveLength(3)
  })

  test(`burger menu toggles with click and Escape`, async () => {
    mount(Nav, { target: document.body, props: { routes: default_routes } })
    const button = doc_query(`.burger`)
    const menu = doc_query(`.menu`)

    expect(button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(menu.classList.contains(`open`)).toBe(false)

    await click(button)
    expect(button.getAttribute(`aria-expanded`)).toBe(`true`)
    expect(menu.classList.contains(`open`)).toBe(true)

    globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape` }))
    await tick()
    expect(button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(menu.classList.contains(`open`)).toBe(false)

    await click(button)
    expect(menu.classList.contains(`open`)).toBe(true)
  })

  test(`menu ID matches aria-controls and closes on link click`, async () => {
    mount(Nav, { target: document.body, props: { routes: default_routes } })
    const button = doc_query(`.burger`)
    const menu = doc_query(`.menu`)
    const panel_id = button.getAttribute(`aria-controls`)

    expect(panel_id).toBeTruthy()
    expect(menu.id).toBe(panel_id)
    expect(panel_id?.startsWith(`nav-menu-`)).toBe(true)
    expect(menu.getAttribute(`role`)).toBe(`menu`)
    expect(menu.getAttribute(`tabindex`)).toBe(`0`)

    await click(button)
    expect(button.getAttribute(`aria-expanded`)).toBe(`true`)

    const link = document.querySelector(`a`)
    if (link) await click(link)
    expect(button.getAttribute(`aria-expanded`)).toBe(`false`)
  })

  test(`applies custom props`, () => {
    mount(Nav, {
      target: document.body,
      props: {
        routes: default_routes,
        class: `custom-class`,
        menu_props: { style: `background: red;` },
      },
    })
    const nav = doc_query(`nav`)
    const menu = doc_query(`.menu`)
    expect(nav.classList.contains(`custom-class`)).toBe(true)
    expect(menu.getAttribute(`style`)).toBe(`background: red;`)
  })

  test.each([
    [
      `mixed routes`,
      [`/`, [`/about`, `About Page`], `/contact`] as (string | [string, string])[],
      [``, `About Page`, `contact`],
    ],
    [`empty routes`, [], []],
    [`HTML labels`, [[`/home`, `<strong>Home</strong>`]] as [string, string][], [`Home`]],
    [`special chars`, [`/path?query=test`, `/path#anchor`], [
      `path?query=test`,
      `path#anchor`,
    ]],
  ])(`handles %s`, (_desc, routes, expected_content) => {
    mount(Nav, { target: document.body, props: { routes } })
    const links = document.querySelectorAll(`a`)
    expect(links).toHaveLength(expected_content.length)
    if (expected_content.length > 0) {
      expect(Array.from(links).map((link) => link.textContent?.trim())).toEqual(
        expected_content,
      )
    }
  })

  test.each([
    [`/about`, `/about`, `page`],
    [`/about/team`, `/about`, `page`],
    [`/contact`, `/about`, null],
    [`/`, `/`, `page`],
    [`/home`, `/`, null],
    // Test fix for partial path matching bug
    [`/some-page-v2`, `/some-page`, null], // should NOT match (v2 should not match base)
    [`/some-page-v2`, `/some-page-v2`, `page`], // should match (exact)
    [`/some-page`, `/some-page-v2`, null], // should NOT match (base should not match v2)
    [`/some-page/sub`, `/some-page`, `page`], // should match (sub-path)
  ])(`aria-current: pathname=%s link=%s -> %s`, (pathname, link_href, expected) => {
    const mock_page = { url: { pathname } } as Page
    mount(Nav, { target: document.body, props: { routes: [link_href], page: mock_page } })
    expect(doc_query(`a[href="${link_href}"]`).getAttribute(`aria-current`)).toBe(
      expected,
    )
  })

  test(`click outside closes menu, inside does not`, async () => {
    mount(Nav, { target: document.body, props: { routes: default_routes } })
    const button = doc_query(`.burger`)
    const menu = doc_query(`.menu`)

    await click(button)
    menu.click()
    expect(button.getAttribute(`aria-expanded`)).toBe(`true`)

    const outside = document.createElement(`div`)
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent(`click`, { bubbles: true, cancelable: true }))
    await tick()
    expect(button.getAttribute(`aria-expanded`)).toBe(`false`)
    outside.remove()
  })

  test(`click outside closes burger menu and dropdowns`, async () => {
    mount(Nav, {
      target: document.body,
      props: { routes: [[`/parent`, [`/parent`, `/parent/child`]]] },
    })
    const burger_button = doc_query(`.burger`)
    const toggle_button = doc_query(`[data-dropdown-toggle]`)
    const { dropdown_menu } = get_dropdown_elements()

    // Open burger menu and dropdown
    await click(burger_button)
    await click(toggle_button)
    expect(burger_button.getAttribute(`aria-expanded`)).toBe(`true`)
    expect(dropdown_menu.classList.contains(`visible`)).toBe(true)

    // Click outside should close both
    const outside = document.createElement(`div`)
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent(`click`, { bubbles: true, cancelable: true }))
    await tick()
    expect(burger_button.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(dropdown_menu.classList.contains(`visible`)).toBe(false)
    outside.remove()
  })

  test(`dropdown structure: parent link, toggle button, filtered children`, () => {
    mount(Nav, {
      target: document.body,
      props: { routes: [[`/parent`, [`/parent`, `/parent/child1`, `/parent/child2`]]] },
    })

    const dropdown = doc_query(`.dropdown`)
    expect(dropdown.getAttribute(`data-href`)).toBe(`/parent`)

    const parent_link = dropdown.querySelector(`div:first-child > a`)
    expect(parent_link?.tagName).toBe(`A`)
    expect(parent_link?.getAttribute(`href`)).toBe(`/parent`)

    const toggle = dropdown.querySelector(`[data-dropdown-toggle]`)
    expect(toggle?.tagName).toBe(`BUTTON`)
    expect(toggle?.getAttribute(`aria-expanded`)).toBe(`false`)
    expect(toggle?.getAttribute(`aria-haspopup`)).toBe(`true`)

    // Dropdown menu is the last div inside .dropdown
    const dropdown_menu = dropdown.querySelector(`div:last-child`)
    const hrefs = Array.from(dropdown_menu?.querySelectorAll(`a`) ?? []).map((link) =>
      link.getAttribute(`href`)
    )
    expect(hrefs).toEqual([`/parent/child1`, `/parent/child2`])
  })

  test.each([
    [`mouse hover on dropdown`, async (dropdown: Element, menu: Element) => {
      dropdown.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      await tick()
      expect(menu.classList.contains(`visible`)).toBe(true)
      dropdown.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
      await tick()
      expect(menu.classList.contains(`visible`)).toBe(false)
    }],
    [`mouse hover on menu`, async (_dropdown: Element, menu: Element) => {
      menu.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      await tick()
      expect(menu.classList.contains(`visible`)).toBe(true)
      menu.dispatchEvent(new MouseEvent(`mouseleave`, { bubbles: true }))
      await tick()
      expect(menu.classList.contains(`visible`)).toBe(false)
    }],
    [`click toggle button`, async (dropdown: Element, menu: Element) => {
      const toggle_button = dropdown.querySelector(`[data-dropdown-toggle]`)
      if (!toggle_button) throw new Error(`toggle button not found`)
      await click(toggle_button)
      expect(menu.classList.contains(`visible`)).toBe(true)
      await click(toggle_button)
      expect(menu.classList.contains(`visible`)).toBe(false)
    }],
  ])(`dropdown interaction via %s`, async (_desc, interaction) => {
    mount(Nav, {
      target: document.body,
      props: { routes: [[`/parent`, [`/parent`, `/parent/child`]]] },
    })
    const { dropdown, dropdown_menu } = get_dropdown_elements()
    expect(dropdown_menu.classList.contains(`visible`)).toBe(false)
    await interaction(dropdown, dropdown_menu)
  })

  test(`parent link and toggle button work independently`, async () => {
    mount(Nav, { target: document.body, props: { routes: [[`/p`, [`/p`, `/p/c`]]] } })
    const { dropdown, dropdown_menu } = get_dropdown_elements()
    const parent_link = dropdown.querySelector(`div:first-child > a`) as HTMLElement
    const toggle = doc_query(`[data-dropdown-toggle]`)

    await click(parent_link)
    expect(dropdown_menu.classList.contains(`visible`)).toBe(false)

    await click(toggle)
    expect(dropdown_menu.classList.contains(`visible`)).toBe(true)

    await click(toggle)
    expect(dropdown_menu.classList.contains(`visible`)).toBe(false)
  })

  test.each([
    [`/plot-color-bar`, `plot color bar`, undefined],
    [`/`, ``, undefined],
    [`/hook-up-to-api`, `Hook up to external API`, {
      '/hook-up-to-api': `Hook up to external API`,
    }],
  ])(`format_label: %s -> "%s"`, (route, expected, labels) => {
    mount(Nav, { target: document.body, props: { routes: [route], labels } })
    const link = doc_query(`a[href="${route}"]`)
    expect(link.textContent?.trim()).toBe(expected)
    // Test inline style since format_label intentionally sets text-transform
    expect(link.getAttribute(`style`)).toBe(labels ? `` : `text-transform: capitalize;`)
  })

  test(`dropdown trigger is not a link when parent page does not exist`, () => {
    mount(Nav, {
      target: document.body,
      props: { routes: [[`/how-to`, [`/how-to/guide-1`, `/how-to/guide-2`]]] },
    })

    const dropdown = doc_query(`.dropdown`)
    // When parent page doesn't exist, trigger is a span (not a link)
    const dropdown_trigger = dropdown.querySelector(`div:first-child > span`)
    expect(dropdown_trigger).not.toBeNull()
    expect(dropdown_trigger?.tagName).toBe(`SPAN`)
    expect(dropdown_trigger?.getAttribute(`href`)).toBeNull()
    expect(dropdown_trigger?.textContent?.trim()).toBe(`how to`)

    const dropdown_menu = dropdown.querySelector(`div:last-child`)
    const dropdown_menu_links = Array.from(
      dropdown_menu?.querySelectorAll(`a`) ?? [],
    ).map((link) => link.getAttribute(`href`))
    expect(dropdown_menu_links).toEqual([`/how-to/guide-1`, `/how-to/guide-2`])
  })

  test(`dropdown trigger is a link when parent page exists`, () => {
    mount(Nav, {
      target: document.body,
      props: { routes: [[`/docs`, [`/docs`, `/docs/intro`, `/docs/api`]]] },
    })

    const dropdown = doc_query(`.dropdown`)
    // When parent page exists, trigger is a link
    const dropdown_trigger = dropdown.querySelector(`div:first-child > a`)
    expect(dropdown_trigger).not.toBeNull()
    expect(dropdown_trigger?.tagName).toBe(`A`)
    expect(dropdown_trigger?.getAttribute(`href`)).toBe(`/docs`)
    expect(dropdown_trigger?.textContent?.trim()).toBe(`docs`)

    const dropdown_menu = dropdown.querySelector(`div:last-child`)
    const dropdown_menu_links = Array.from(
      dropdown_menu?.querySelectorAll(`a`) ?? [],
    ).map((link) => link.getAttribute(`href`))
    expect(dropdown_menu_links).toEqual([`/docs/intro`, `/docs/api`])
  })

  test(`dropdown accessibility and state management`, async () => {
    const mock_page = { url: { pathname: `/parent/child` } } as Page
    mount(Nav, {
      target: document.body,
      props: {
        routes: [
          [`/parent`, [`/parent`, `/parent/child`]],
          [`/other`, [`/other`]],
        ],
        page: mock_page,
      },
    })

    const [dropdown1, dropdown2] = Array.from(
      document.querySelectorAll(`.dropdown`),
    )
    const menu1 = dropdown1.querySelector(`div:last-child`) as HTMLElement
    const toggle1 = dropdown1.querySelector(`[data-dropdown-toggle]`) as HTMLElement

    // aria-expanded toggles correctly on toggle button
    // Note: aria-controls linkage is not currently implemented for dropdowns (only for burger menu)
    expect(toggle1.getAttribute(`aria-expanded`)).toBe(`false`)
    await click(toggle1)
    expect(toggle1.getAttribute(`aria-expanded`)).toBe(`true`)
    expect(menu1.classList.contains(`visible`)).toBe(true)

    // Escape key closes dropdown
    globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape` }))
    await tick()
    expect(menu1.classList.contains(`visible`)).toBe(false)

    // Multiple dropdowns work independently
    const toggle2 = dropdown2.querySelector(`[data-dropdown-toggle]`) as HTMLElement
    await click(toggle1)
    const menu2 = dropdown2.querySelector(`div:last-child`) as HTMLElement
    expect(menu1.classList.contains(`visible`)).toBe(true)
    expect(menu2.classList.contains(`visible`)).toBe(false)

    await click(toggle2)
    expect(menu1.classList.contains(`visible`)).toBe(false)
    expect(menu2.classList.contains(`visible`)).toBe(true)

    // aria-current applied to parent link and dropdown child
    const parent_link = dropdown1.querySelector(`div:first-child > a`)
    expect(parent_link?.getAttribute(`aria-current`)).toBe(`page`)
    const dropdown_links = menu1.querySelectorAll(`a`)
    expect(dropdown_links[0].getAttribute(`aria-current`)).toBe(`page`)
  })

  test(`keyboard navigation: Enter/Space/ArrowDown open, arrows navigate, Escape closes`, async () => {
    mount(Nav, {
      target: document.body,
      props: { routes: [[`/p`, [`/p`, `/p/1`, `/p/2`]]] },
    })
    const toggle_button = doc_query(`[data-dropdown-toggle]`)
    const { dropdown_menu: menu } = get_dropdown_elements()
    const key = (k: string, target = toggle_button) =>
      target.dispatchEvent(new KeyboardEvent(`keydown`, { key: k, bubbles: true }))
    // Helper for async focus operations that need DOM event loop
    const wait_for_focus = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0)) // Wait for DOM focus
    }

    // Enter/Space/ArrowDown all open and focus first item
    for (const open_key of [`Enter`, ` `, `ArrowDown`]) {
      key(open_key)
      // deno-lint-ignore no-await-in-loop
      await wait_for_focus()
      expect(menu.classList.contains(`visible`)).toBe(true)
      expect(document.activeElement).toBe(menu.querySelector(`a`))
      globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape` }))
    }

    // Arrow navigation
    const [item1, item2] = Array.from(menu.querySelectorAll(`a`))
    key(`Enter`)
    await wait_for_focus()
    expect(document.activeElement).toBe(item1)
    key(`ArrowDown`)
    expect(document.activeElement).toBe(item2)
    key(`ArrowDown`)
    expect(document.activeElement).toBe(item2) // stays at end
    key(`ArrowUp`)
    expect(document.activeElement).toBe(item1)

    // Escape from item returns focus to toggle button
    key(`Escape`, item1 as HTMLElement)
    await wait_for_focus()
    expect(menu.classList.contains(`visible`)).toBe(false)
    expect(document.activeElement).toBe(toggle_button)
  })

  test(`dropdown focus behavior`, async () => {
    mount(Nav, { target: document.body, props: { routes: [[`/p`, [`/p`, `/p/1`]]] } })
    const { dropdown, dropdown_menu: menu } = get_dropdown_elements()

    dropdown.dispatchEvent(
      new FocusEvent(`focusin`, { bubbles: true, relatedTarget: null }),
    )
    await tick()
    expect(menu.classList.contains(`visible`)).toBe(true)

    const external = document.createElement(`button`)
    document.body.appendChild(external)
    dropdown.dispatchEvent(
      new FocusEvent(`focusout`, { bubbles: true, relatedTarget: external }),
    )
    await tick()
    expect(menu.classList.contains(`visible`)).toBe(false)
    external.remove()
  })

  test.each([
    [`/parent/child1`, true],
    [`/parent`, true],
    [`/other`, false],
  ])(`dropdown active state: pathname=%s -> active=%s`, (pathname, is_active) => {
    const mock_page = { url: { pathname } } as Page
    mount(Nav, {
      target: document.body,
      props: {
        routes: [[`/parent`, [`/parent`, `/parent/child1`]], [`/other`, [`/other`]]],
        page: mock_page,
      },
    })

    const [dropdown1, dropdown2] = Array.from(
      document.querySelectorAll(`.dropdown`),
    )
    expect(dropdown1.classList.contains(`active`)).toBe(is_active)
    expect(dropdown2.classList.contains(`active`)).toBe(
      !is_active && pathname === `/other`,
    )
  })

  test(`dropdown accessibility: role and aria-label attributes`, () => {
    mount(Nav, {
      target: document.body,
      props: { routes: [[`/docs`, [`/docs`, `/docs/intro`]]] },
    })

    const dropdown = doc_query(`.dropdown`)
    // Check dropdown menu (last div) has role="menu"
    const dropdown_menu = dropdown.querySelector(`div:last-child`)
    expect(dropdown_menu?.getAttribute(`role`)).toBe(`menu`)

    // Check dropdown links have role="menuitem"
    const dropdown_links = Array.from(dropdown_menu?.querySelectorAll(`a`) ?? [])
    for (const link of dropdown_links) {
      expect(link.getAttribute(`role`)).toBe(`menuitem`)
    }

    // Check toggle button has aria-label
    const toggle_button = doc_query(`[data-dropdown-toggle]`)
    const aria_label = toggle_button.getAttribute(`aria-label`)
    expect(aria_label).toBeTruthy()
    expect(aria_label).toMatch(/Toggle.*submenu/)
  })

  // Tests for new NavRouteObject features
  describe(`NavRouteObject format`, () => {
    test(`renders object routes with href and label`, () => {
      const routes: NavRoute[] = [
        { href: `/home`, label: `Home Page` },
        { href: `/about` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      const links = document.querySelectorAll(`a`)
      expect(links).toHaveLength(2)
      expect(links[0].getAttribute(`href`)).toBe(`/home`)
      expect(links[0].textContent?.trim()).toBe(`Home Page`)
      expect(links[1].getAttribute(`href`)).toBe(`/about`)
      expect(links[1].textContent?.trim()).toBe(`about`)
    })

    test(`renders disabled routes as non-clickable spans`, () => {
      const routes: NavRoute[] = [
        { href: `/enabled` },
        { href: `/disabled`, disabled: true },
        { href: `/disabled-msg`, disabled: `Coming soon` },
      ]
      mount(Nav, { target: document.body, props: { routes } })

      const links = document.querySelectorAll(`a`)
      expect(links).toHaveLength(1)
      expect(links[0].getAttribute(`href`)).toBe(`/enabled`)

      const disabled_spans = document.querySelectorAll(`.disabled`)
      expect(disabled_spans).toHaveLength(2)
      expect(disabled_spans[0].getAttribute(`aria-disabled`)).toBe(`true`)
      expect(disabled_spans[1].getAttribute(`aria-disabled`)).toBe(`true`)
    })

    test(`renders separators between items`, () => {
      const routes: NavRoute[] = [
        { href: `/home` },
        { href: `/about`, separator: true },
        { href: `/contact` },
      ]
      mount(Nav, { target: document.body, props: { routes } })

      const separators = document.querySelectorAll(`.separator`)
      expect(separators).toHaveLength(1)
      expect(separators[0].getAttribute(`role`)).toBe(`separator`)
    })

    test(`renders separator-only items`, () => {
      const routes: NavRoute[] = [
        { href: `/home` },
        { separator: true } as NavRoute,
        { href: `/contact` },
      ]
      mount(Nav, { target: document.body, props: { routes } })

      const separators = document.querySelectorAll(`.separator`)
      expect(separators).toHaveLength(1)
      const links = document.querySelectorAll(`a`)
      expect(links).toHaveLength(2)
    })

    test(`applies align-right class for right-aligned items`, () => {
      const routes: NavRoute[] = [
        { href: `/home` },
        { href: `/settings`, align: `right` },
      ]
      mount(Nav, { target: document.body, props: { routes } })

      const right_items = document.querySelectorAll(`.align-right`)
      expect(right_items).toHaveLength(1)
    })

    test(`adds external link attributes`, () => {
      const routes: NavRoute[] = [
        { href: `/internal` },
        { href: `https://example.com`, external: true },
      ]
      mount(Nav, { target: document.body, props: { routes } })

      const links = document.querySelectorAll(`a`)
      expect(links[0].getAttribute(`target`)).toBeNull()
      expect(links[0].getAttribute(`rel`)).toBeNull()
      expect(links[1].getAttribute(`target`)).toBe(`_blank`)
      expect(links[1].getAttribute(`rel`)).toBe(`noopener noreferrer`)
    })

    test(`applies custom class and style from route object`, () => {
      const routes: NavRoute[] = [
        { href: `/styled`, class: `custom-nav-item`, style: `color: red` },
      ]
      mount(Nav, { target: document.body, props: { routes } })

      const link = doc_query(`a[href="/styled"]`)
      expect(link.classList.contains(`custom-nav-item`)).toBe(true)
      expect(link.getAttribute(`style`)).toContain(`color: red`)
    })

    test(`renders dropdown with object route format`, () => {
      const routes: NavRoute[] = [
        { href: `/docs`, children: [`/docs/intro`, `/docs/api`] },
      ]
      mount(Nav, { target: document.body, props: { routes } })

      const dropdown = doc_query(`.dropdown`)
      expect(dropdown).toBeTruthy()
      const dropdown_menu = dropdown.querySelector(`div:last-child`)
      const hrefs = Array.from(dropdown_menu?.querySelectorAll(`a`) ?? []).map(
        (link) => link.getAttribute(`href`),
      )
      expect(hrefs).toEqual([`/docs/intro`, `/docs/api`])
    })
  })

  describe(`disabled routes`, () => {
    test.each([
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
      mount(Nav, { target: document.body, props: { routes: [route as NavRoute] } })
      const disabled = doc_query(`.disabled`)
      expect(disabled.getAttribute(`aria-disabled`)).toBe(`true`)
      expect(disabled.textContent?.trim()).toBe(expected_text)
    })

    test(`disabled items apply custom class and style`, () => {
      const routes: NavRoute[] = [
        { href: `/test`, disabled: true, class: `my-disabled`, style: `opacity: 0.3` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      const disabled = doc_query(`.disabled`)
      expect(disabled.classList.contains(`my-disabled`)).toBe(true)
      expect(disabled.getAttribute(`style`)).toContain(`opacity: 0.3`)
    })

    test(`clicking disabled item does not trigger onnavigate`, async () => {
      const on_navigate = vi.fn()
      mount(Nav, {
        target: document.body,
        props: {
          routes: [{ href: `/disabled`, disabled: true }],
          onnavigate: on_navigate,
        },
      })
      await click(doc_query(`.disabled`))
      expect(on_navigate).not.toHaveBeenCalled()
    })

    test(`mixed enabled/disabled items`, () => {
      const routes: NavRoute[] = [
        { href: `/home` },
        { href: `/disabled1`, disabled: true },
        { href: `/about` },
        { href: `/disabled2`, disabled: `Coming soon` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      expect(document.querySelectorAll(`a`)).toHaveLength(2)
      expect(document.querySelectorAll(`.disabled`)).toHaveLength(2)
    })

    test(`disabled dropdown parent renders as span, not link`, () => {
      const routes: NavRoute[] = [
        { href: `/docs`, children: [`/docs`, `/docs/intro`], disabled: true },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      const dropdown = doc_query(`.dropdown`)
      // Parent should be a disabled span, not a link
      const parent_span = dropdown.querySelector(`div:first-child > span.disabled`)
      expect(parent_span).not.toBeNull()
      expect(parent_span?.getAttribute(`aria-disabled`)).toBe(`true`)
      // Should NOT have a parent link
      const parent_link = dropdown.querySelector(`div:first-child > a`)
      expect(parent_link).toBeNull()
      // Dropdown children should still be accessible
      const dropdown_menu = dropdown.querySelector(`div:last-child`)
      expect(dropdown_menu?.querySelectorAll(`a`)).toHaveLength(1)
    })
  })

  describe(`separators`, () => {
    test.each([
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
        [{ href: `/home`, separator: true }, { href: `/about`, separator: true }, {
          href: `/contact`,
        }],
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
      mount(Nav, { target: document.body, props: { routes: routes as NavRoute[] } })
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
      mount(Nav, { target: document.body, props: { routes } })
      expect(document.querySelectorAll(`.separator`)).toHaveLength(1)
      expect(doc_query(`.dropdown`)).toBeTruthy()
    })
  })

  describe(`external links`, () => {
    test(`external links have target=_blank and rel=noopener`, () => {
      const routes: NavRoute[] = [
        { href: `https://github.com`, external: true },
        { href: `https://twitter.com`, external: true, label: `Twitter` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      document.querySelectorAll(`a`).forEach((link) => {
        expect(link.getAttribute(`target`)).toBe(`_blank`)
        expect(link.getAttribute(`rel`)).toBe(`noopener noreferrer`)
      })
    })

    test(`external link with custom class, style, and label`, () => {
      const routes: NavRoute[] = [
        {
          href: `https://example.com`,
          external: true,
          class: `ext`,
          style: `color: blue`,
          label: `Link`,
        },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      const link = doc_query(`a`)
      expect(link.textContent?.trim()).toBe(`Link`)
      expect(link.classList.contains(`ext`)).toBe(true)
      expect(link.getAttribute(`style`)).toContain(`color: blue`)
    })

    test(`mixed internal and external links`, () => {
      const routes: NavRoute[] = [
        { href: `/home` },
        { href: `https://docs.example.com`, external: true },
        { href: `/about` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      const links = document.querySelectorAll(`a`)
      expect(links[0].getAttribute(`target`)).toBeNull()
      expect(links[1].getAttribute(`target`)).toBe(`_blank`)
      expect(links[2].getAttribute(`target`)).toBeNull()
    })

    test(`external link triggers onnavigate callback`, async () => {
      const on_navigate = vi.fn()
      mount(Nav, {
        target: document.body,
        props: {
          routes: [{ href: `https://example.com`, external: true }],
          onnavigate: on_navigate,
        },
      })
      await click(doc_query(`a`))
      expect(on_navigate).toHaveBeenCalledWith(
        expect.objectContaining({ route: expect.objectContaining({ external: true }) }),
      )
    })
  })

  describe(`right-aligned items`, () => {
    test(`multiple right-aligned items`, () => {
      const routes: NavRoute[] = [
        { href: `/home` },
        { href: `/settings`, align: `right` },
        { href: `/profile`, align: `right` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      expect(document.querySelectorAll(`.align-right`)).toHaveLength(2)
    })

    test(`right-aligned dropdown`, () => {
      const routes: NavRoute[] = [
        { href: `/user`, children: [`/user/profile`], align: `right` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      expect(doc_query(`.dropdown`).classList.contains(`align-right`)).toBe(true)
    })

    test(`right-aligned item with class and style`, () => {
      const routes: NavRoute[] = [
        {
          href: `/settings`,
          align: `right`,
          class: `settings-link`,
          style: `font-weight: bold`,
        },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      const link = doc_query(`.align-right a`)
      expect(link.classList.contains(`settings-link`)).toBe(true)
      expect(link.getAttribute(`style`)).toContain(`font-weight: bold`)
    })
  })

  describe(`custom route properties`, () => {
    test(`custom properties accessible in onnavigate callback`, async () => {
      const on_navigate = vi.fn()
      const routes = [{ href: `/custom`, icon: `gear`, count: 42 }] as NavRoute[]
      mount(Nav, { target: document.body, props: { routes, onnavigate: on_navigate } })
      await click(doc_query(`a`))
      expect(on_navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          route: expect.objectContaining({ href: `/custom`, icon: `gear`, count: 42 }),
        }),
      )
    })
  })

  describe(`callbacks`, () => {
    test(`onnavigate called with href, event, and route`, async () => {
      const on_navigate = vi.fn()
      mount(Nav, {
        target: document.body,
        props: { routes: [`/home`], onnavigate: on_navigate },
      })
      await click(doc_query(`a`))
      expect(on_navigate).toHaveBeenCalledWith(
        expect.objectContaining({
          href: `/home`,
          event: expect.any(MouseEvent),
          route: expect.objectContaining({ href: `/home` }),
        }),
      )
    })

    test(`onnavigate returning false prevents default`, async () => {
      const on_navigate = vi.fn((): false => false)
      mount(Nav, {
        target: document.body,
        props: { routes: [`/home`], onnavigate: on_navigate },
      })
      const event = new MouseEvent(`click`, { bubbles: true, cancelable: true })
      doc_query(`a`).dispatchEvent(event)
      await tick()
      expect(event.defaultPrevented).toBe(true)
    })

    test(`onnavigate called for multiple clicks and dropdown children`, async () => {
      const on_navigate = vi.fn()
      const routes: NavRoute[] = [`/a`, `/b`, {
        href: `/docs`,
        children: [`/docs`, `/docs/intro`],
      }]
      mount(Nav, { target: document.body, props: { routes, onnavigate: on_navigate } })

      await click(doc_query(`a[href="/a"]`))
      await click(doc_query(`a[href="/b"]`))
      await click(doc_query(`[data-dropdown-toggle]`))
      const intro_link = document.querySelector(`a[href="/docs/intro"]`)
      if (intro_link) await click(intro_link)

      expect(on_navigate).toHaveBeenCalledTimes(3)
      expect(on_navigate).toHaveBeenLastCalledWith(
        expect.objectContaining({ href: `/docs/intro` }),
      )
    })

    test(`onopen and onclose callbacks on menu toggle`, async () => {
      const on_open = vi.fn()
      const on_close = vi.fn()
      Object.defineProperty(globalThis, `innerWidth`, { value: 500, writable: true })

      mount(Nav, {
        target: document.body,
        props: { routes: [`/home`], onopen: on_open, onclose: on_close, breakpoint: 767 },
      })
      await tick()
      const burger = doc_query(`.burger`)

      await click(burger)
      await tick()
      expect(on_open).toHaveBeenCalledTimes(1)

      await click(burger)
      await tick()
      expect(on_close).toHaveBeenCalledTimes(1)

      Object.defineProperty(globalThis, `innerWidth`, { value: 1024, writable: true })
    })

    test.each([
      [`clicking link`, async () => await click(doc_query(`a`))],
      [
        `pressing Escape`,
        () => globalThis.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Escape` })),
      ],
    ])(`onclose called when %s closes menu`, async (_desc, close_action) => {
      const on_close = vi.fn()
      Object.defineProperty(globalThis, `innerWidth`, { value: 500, writable: true })

      mount(Nav, {
        target: document.body,
        props: { routes: [`/home`], onclose: on_close, breakpoint: 767 },
      })
      await tick()
      await click(doc_query(`.burger`))
      await tick()
      await close_action()
      await tick()
      expect(on_close).toHaveBeenCalled()

      Object.defineProperty(globalThis, `innerWidth`, { value: 1024, writable: true })
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
        Object.defineProperty(globalThis, `innerWidth`, { value: width, writable: true })
        mount(Nav, {
          target: document.body,
          props: { routes: [`/home`], ...(breakpoint !== undefined && { breakpoint }) },
        })
        await tick()
        expect(doc_query(`nav`).classList.contains(`mobile`)).toBe(expected_mobile)
        Object.defineProperty(globalThis, `innerWidth`, { value: 1024, writable: true })
      },
    )
  })

  describe(`mixed route formats`, () => {
    test(`handles all route formats together`, () => {
      const routes: NavRoute[] = [
        `/simple`,
        [`/tuple`, `Tuple Label`],
        [`/dropdown`, [`/dropdown/a`, `/dropdown/b`]],
        { href: `/object`, label: `Object Label` },
        { href: `/disabled`, disabled: true },
        { href: `/external`, external: true },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      expect(document.querySelectorAll(`a`)).toHaveLength(6)
      expect(document.querySelectorAll(`.disabled`)).toHaveLength(1)
      expect(doc_query(`.dropdown`)).toBeTruthy()
    })

    test(`complex navigation with all features`, () => {
      const routes: NavRoute[] = [
        { href: `/`, label: `Home` },
        { separator: true } as NavRoute,
        [`/docs`, [`/docs`, `/docs/api`]],
        { href: `/admin`, disabled: `Login required` },
        { href: `/settings`, align: `right` },
        { href: `https://github.com`, external: true, align: `right` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      expect(document.querySelectorAll(`.separator`)).toHaveLength(1)
      expect(document.querySelectorAll(`.disabled`)).toHaveLength(1)
      expect(document.querySelectorAll(`.align-right`)).toHaveLength(2)
      expect(doc_query(`.dropdown`)).toBeTruthy()
    })

    test(`route order preserved and empty routes render nothing`, () => {
      mount(Nav, {
        target: document.body,
        props: { routes: [{ href: `/a` }, { href: `/b` }] },
      })
      const links = document.querySelectorAll(`a`)
      expect(links[0].getAttribute(`href`)).toBe(`/a`)
      expect(links[1].getAttribute(`href`)).toBe(`/b`)
    })
  })

  describe(`dropdown with object format`, () => {
    test.each([
      [
        `label`,
        { href: `/docs`, label: `Documentation`, children: [`/docs/intro`] },
        `Documentation`,
      ],
      [
        `custom class`,
        { href: `/menu`, children: [`/menu/a`], class: `custom-dropdown` },
        `menu`,
      ],
    ])(`dropdown with %s`, (_desc, route, expected_text) => {
      mount(Nav, { target: document.body, props: { routes: [route as NavRoute] } })
      const trigger = doc_query(`.dropdown span`)
      expect(trigger.textContent?.trim()).toBe(expected_text)
      if (`class` in route) {
        expect(trigger.classList.contains(route.class as string)).toBe(true)
      }
    })

    test(`dropdown with align right and separator`, () => {
      const routes: NavRoute[] = [
        { href: `/user`, children: [`/user/profile`], align: `right`, separator: true },
        { href: `/other` },
      ]
      mount(Nav, { target: document.body, props: { routes } })
      expect(doc_query(`.dropdown`).classList.contains(`align-right`)).toBe(true)
      expect(document.querySelectorAll(`.separator`)).toHaveLength(1)
    })
  })

  describe(`aria-current with object routes`, () => {
    test.each([
      [{ href: `/about` }, `/about`, `page`],
      [{ href: `/about`, label: `About Us` }, `/about`, `page`],
      [{ href: `/contact` }, `/about`, null],
      [{ href: `/`, label: `Home` }, `/`, `page`],
    ])(
      `aria-current with object route %o on pathname %s -> %s`,
      (route, pathname, expected) => {
        const mock_page = { url: { pathname } } as Page
        mount(Nav, {
          target: document.body,
          props: { routes: [route as NavRoute], page: mock_page },
        })
        const link = doc_query(`a[href="${route.href}"]`)
        expect(link.getAttribute(`aria-current`)).toBe(expected)
      },
    )
  })
})
