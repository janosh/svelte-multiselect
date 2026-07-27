import ContributorList from '$lib/ContributorList.svelte'
import { mount, tick } from 'svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

describe(`ContributorList`, () => {
  const contributors = [
    {
      login: `janosh`,
      avatar_url: `https://avatars.gh/1`,
      html_url: `https://gh/janosh`,
    },
    {
      login: `octocat`,
      avatar_url: `https://avatars.gh/2`,
      html_url: `https://gh/octocat`,
    },
  ]
  // attachments are applied in an effect, so the tooltip isn't live until a flush
  const mount_list = async (props: Record<string, unknown> = {}) => {
    mount(ContributorList, { target: document.body, props: { contributors, ...props } })
    await tick()
  }
  const hover = (element: Element) => {
    element.dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
    vi.runAllTimers()
  }

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test(`renders one linked avatar per contributor`, async () => {
    await mount_list()

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(`ul li a`))
    expect(links.map((link) => link.getAttribute(`href`))).toEqual([
      `https://gh/janosh`,
      `https://gh/octocat`,
    ])
    const avatars = Array.from(document.querySelectorAll<HTMLImageElement>(`ul li img`))
    expect(avatars.map((img) => [img.getAttribute(`src`), img.alt])).toEqual([
      [`https://avatars.gh/1`, `janosh`],
      [`https://avatars.gh/2`, `octocat`],
    ])
  })

  // the hand-rolled hover label this port replaced is gone; the shared tooltip
  // attachment renders the username instead
  test(`hovering an avatar shows the login in a tooltip`, async () => {
    await mount_list()
    expect(document.querySelector(`.custom-tooltip`)).toBeNull()

    hover(doc_query(`ul li a`))
    expect(document.querySelectorAll(`.custom-tooltip`)).toHaveLength(1)
    expect(doc_query(`.tooltip-content`).textContent).toBe(`janosh`)
    // no sibling <span> label: the old markup is deleted, not merely hidden
    expect(document.querySelector(`ul li > span`)).toBeNull()
  })

  test(`tooltip_options reach the attachment`, async () => {
    await mount_list({ tooltip_options: { placement: `bottom`, delay: 0 } })

    hover(doc_query(`ul li:last-child a`))
    expect(doc_query(`.tooltip-content`).textContent).toBe(`octocat`)
  })

  test.each([
    [`empty list`, [], 0],
    [`single contributor`, [contributors[0]], 1],
  ])(`renders %s`, async (_desc, list, expected_count) => {
    await mount_list({ contributors: list })
    expect(document.querySelectorAll(`ul li`)).toHaveLength(expected_count)
    expect(document.querySelector(`ul`)).not.toBeNull()
  })

  test(`spreads rest props onto the list element`, async () => {
    await mount_list({ class: `contributors`, style: `--contributor-avatar-size: 40px` })

    const list = doc_query(`ul`)
    expect(list.classList.contains(`contributors`)).toBe(true)
    expect(list.getAttribute(`style`)).toBe(`--contributor-avatar-size: 40px;`)
  })
})
