import { GitHubCorner } from '$lib'
import { mount } from 'svelte'
import { expect, test } from 'vitest'

test(`GitHubCorner renders link with svg`, () => {
  const href = `https://github.com/foo/bar`
  mount(GitHubCorner, { target: document.body, props: { href } })
  const link = document.querySelector(`a`)
  expect(link?.getAttribute(`href`)).toBe(href)
  expect(link?.querySelector(`svg`)).toBeTruthy()
})
