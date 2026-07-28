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
    const avatars = Array.from(document.querySelectorAll<HTMLImageElement>(`ul li img`))
    // the login names the link, since the avatar it wraps is decorative
    expect(links.map((link) => [link.href, link.getAttribute(`aria-label`)])).toEqual([
      [`https://gh/janosh`, `janosh`],
      [`https://gh/octocat`, `octocat`],
    ])
    expect(avatars.map((img) => img.getAttribute(`src`))).toEqual([
      `https://avatars.gh/1`,
      `https://avatars.gh/2`,
    ])
    // chrome shared by every row: profiles are off-site, and an intrinsic size keeps
    // lazy avatars from reflowing the row as they land
    expect([links[0].target, links[0].rel]).toEqual([`_blank`, `noopener noreferrer`])
    expect([avatars[0].alt, avatars[0].width, avatars[0].height]).toEqual([``, 60, 60])
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
    await mount_list({ tooltip_options: { show_arrow: false, style: `color: teal` } })

    hover(doc_query(`ul li:last-child a`))
    expect(doc_query(`.tooltip-content`).textContent).toBe(`octocat`)
    // the options themselves, not just the content the component sets on its own
    expect(doc_query(`.custom-tooltip`).style.color).toBe(`teal`)
    expect(document.querySelector(`.custom-tooltip-arrow`)).toBeNull()
  })

  test.each([
    [`empty list`, [], 0],
    [`single contributor`, [contributors[0]], 1],
  ])(`renders %s`, async (_desc, list, expected_count) => {
    await mount_list({ contributors: list })
    expect(document.querySelectorAll(`ul li`)).toHaveLength(expected_count)
    expect(document.querySelector(`ul`)).not.toBeNull()
  })
})
