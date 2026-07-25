import { SubpageGrid } from '$lib'
import BasicsPage from '$root/src/routes/(demos)/(basics)/basics/+page.svelte'
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
  mount(BasicsPage, { target: document.body })

  expect(
    [...document.querySelectorAll(`nav.grid a`)].map((link) => link.getAttribute(`href`)),
  ).toEqual([`/docs/form`, `/docs/events`, `/docs/disabled`])
})
