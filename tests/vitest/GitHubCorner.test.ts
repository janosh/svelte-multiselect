import { GitHubCorner } from '$lib'
import { mount } from 'svelte'
import { describe, expect, test } from 'vitest'

describe(`GitHubCorner`, () => {
  test(`renders with default props`, () => {
    mount(GitHubCorner, {
      target: document.body,
      props: { href: `https://github.com/janosh/blog` },
    })
    const link = document.querySelector(`a`)
    expect(link).toBeTruthy()
    expect(link?.getAttribute(`href`)).toBe(`https://github.com/janosh/blog`)
  })

  test(`renders GitHub corner component`, () => {
    mount(GitHubCorner, {
      target: document.body,
      props: { href: `https://github.com/test/repo` },
    })
    const link = document.querySelector(`a`)
    expect(link).toBeTruthy()
    expect(link?.querySelector(`svg`)).toBeTruthy()
  })
})
