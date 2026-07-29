import { SubpageGrid } from '$lib'
import type { IconName } from '$lib/icons'
import MultiSelectPage from '$root/src/routes/(demos)/(multiselect)/multiselect/+page.md'
import { mount } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'

// stands in for a configured base path, which is what resolve() prefixes
vi.mock(`$app/paths`, () => ({ resolve: (path: string) => `/docs${path}` }))

test(`renders one card per tuple subpage in order`, () => {
  const subpages: [string, string, string][] = [
    [`Basics`, `/basics`, `Basics overview`],
    [`Styling`, `/styling`, `Styling overview`],
  ]
  mount(SubpageGrid, {
    target: document.body,
    props: { title: `Demo`, subtitle: `Demo subtitle`, subpages },
  })

  expect(document.querySelector(`h1`)?.textContent).toBe(`Demo`)
  expect(document.querySelector(`.subtitle`)?.textContent).toBe(`Demo subtitle`)

  const cards = [...document.querySelectorAll<HTMLAnchorElement>(`nav.grid a.card`)]
  expect(cards).toHaveLength(subpages.length)
  // whole table at once: a dropped card or swapped title/description shows up
  expect(
    cards.map((card) => [
      card.getAttribute(`href`),
      card.querySelector(`h2`)?.textContent,
      card.querySelector(`div > p`)?.textContent,
      card.querySelector(`svg.icon`)?.tagName, // every card carries the chevron
    ]),
  ).toEqual(
    subpages.map(([page_title, href, description]) => [
      href,
      page_title,
      description,
      `svg`,
    ]),
  )
})

test(`overview pages link to base-prefixed sibling routes`, () => {
  mount(MultiSelectPage, { target: document.body })

  const hrefs = [...document.querySelectorAll(`nav.grid a`)].map((link) =>
    link.getAttribute(`href`),
  )
  // every link goes through resolve() so it picks up the base path, and the grid is
  // non-empty. Listing exact routes here would break every time a demo moves.
  expect(hrefs.length).toBeGreaterThan(5)
  expect(hrefs.every((href) => href?.startsWith(`/docs/`))).toBe(true)
  expect(hrefs).toContain(`/docs/form`)
})

test(`per-page icons override the fallback, which is itself configurable`, () => {
  const icons_for = (subpages: [string, string, string, IconName?][], props = {}) => {
    document.body.innerHTML = ``
    mount(SubpageGrid, {
      target: document.body,
      props: { title: `Demo`, subtitle: `sub`, subpages, ...props },
    })
    return [...document.querySelectorAll(`nav.grid a.card svg.icon`)].map(
      (svg) => svg.innerHTML,
    )
  }
  const pages: [string, string, string, IconName?][] = [
    [`Plain`, `/plain`, `no icon`],
    [`Marked`, `/marked`, `with icon`, `Copy`],
  ]
  const [chevron, explicit] = icons_for(pages)
  expect(explicit).not.toBe(chevron)
  const [fallback, still_explicit] = icons_for(pages, { fallback_icon: `Check` })
  expect(fallback).not.toBe(chevron)
  expect(still_explicit).toBe(explicit)
})

// an href is a destination, not an identity: two cards may point at one page under
// different titles, and a bare href key would throw each_key_duplicate
test(`renders cards sharing an href`, () => {
  const subpages: [string, string, string][] = [
    [`Basics`, `/guide`, `Start here`],
    [`Advanced`, `/guide`, `Same page, deeper`],
  ]
  mount(SubpageGrid, {
    target: document.body,
    props: { title: `Demo`, subtitle: `Demo subtitle`, subpages },
  })

  expect(
    [...document.querySelectorAll(`nav.grid a.card h2`)].map((h2) => h2.textContent),
  ).toEqual([`Basics`, `Advanced`])
})
