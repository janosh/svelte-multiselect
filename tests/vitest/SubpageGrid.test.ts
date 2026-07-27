import { SubpageGrid } from '$lib'
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
