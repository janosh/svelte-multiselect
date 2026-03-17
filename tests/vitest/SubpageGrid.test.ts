import { SubpageGrid } from '$lib'
import { mount } from 'svelte'
import { expect, test } from 'vite-plus/test'

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
