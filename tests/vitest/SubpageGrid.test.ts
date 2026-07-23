import { SubpageGrid } from '$lib'
import BasicsPage from '$root/src/routes/(demos)/basics/+page.svelte'
import { mount } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'

vi.mock(`$app/paths`, () => ({ base: `/docs` }))

test(`renders tuple subpages correctly`, () => {
  mount(SubpageGrid, {
    target: document.body,
    props: {
      title: `Demo`,
      subtitle: `Demo subtitle`,
      subpages: [[`Basics`, `/basics`, `Basics overview`]],
    },
  })

  const title_element = document.querySelector(`h1`)
  const subtitle_element = document.querySelector(`.subtitle`)
  const link_element = document.querySelector(`nav a`)

  expect(title_element?.textContent).toBe(`Demo`)
  expect(subtitle_element?.textContent).toBe(`Demo subtitle`)
  expect(link_element?.getAttribute(`href`)).toBe(`/basics`)
  expect(link_element?.textContent).toContain(`Basics`)
  expect(link_element?.textContent).toContain(`Basics overview`)
})

test(`overview pages link to base-prefixed sibling routes`, () => {
  mount(BasicsPage, { target: document.body })

  expect(
    [...document.querySelectorAll(`nav.grid a`)].map((link) => link.getAttribute(`href`)),
  ).toEqual([`/docs/form`, `/docs/events`, `/docs/disabled`])
})
