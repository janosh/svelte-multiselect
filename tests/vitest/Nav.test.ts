import { Nav } from '$lib'
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
    const dropdown = doc_query(`.dropdown`)
    const dropdown_menu = dropdown.querySelector(`div:last-child`) as HTMLElement

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
    const dropdown = doc_query(`.dropdown`)
    const dropdown_menu = dropdown.querySelector(`div:last-child`) as HTMLElement

    expect(dropdown_menu.classList.contains(`visible`)).toBe(false)
    await interaction(dropdown, dropdown_menu)
  })

  test(`parent link and toggle button work independently`, async () => {
    mount(Nav, { target: document.body, props: { routes: [[`/p`, [`/p`, `/p/c`]]] } })
    const dropdown = doc_query(`.dropdown`)
    const dropdown_menu = dropdown.querySelector(`div:last-child`) as HTMLElement
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
    const dropdown = doc_query(`.dropdown`)
    const menu = dropdown.querySelector(`div:last-child`) as HTMLElement
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
    const dropdown = doc_query(`.dropdown`)
    const menu = dropdown.querySelector(`div:last-child`) as HTMLElement

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
})
