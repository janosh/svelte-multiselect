import { PrevNext } from '$lib'
import { mount } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const items = [`page1`, `page2`, `page3`, `page4`]

describe(`PrevNext`, () => {
  let target: HTMLElement
  let replaceStateSpy: ReturnType<typeof vi.fn>
  let pushStateSpy: ReturnType<typeof vi.fn>
  let scrollToSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    target = document.body
    replaceStateSpy = vi.fn()
    pushStateSpy = vi.fn()
    scrollToSpy = vi.fn()

    Object.defineProperty(window, `history`, {
      value: { replaceState: replaceStateSpy, pushState: pushStateSpy },
    })
    Object.defineProperty(window, `scrollTo`, { value: scrollToSpy })
    Object.defineProperty(window, `scrollX`, { value: 100, writable: true })
    Object.defineProperty(window, `scrollY`, { value: 200, writable: true })
  })

  test(`renders nothing with less than min_items`, () => {
    mount(PrevNext, { target, props: { items: [`page1`, `page2`], current: `page1` } })
    expect(target.querySelector(`nav`)).toBeNull()
  })

  test.each([
    { current: `page2`, prev_href: `page1`, next_href: `page3`, desc: `middle item` },
    {
      current: `page1`,
      prev_href: `page4`,
      next_href: `page2`,
      desc: `first item wraps`,
    },
    { current: `page4`, prev_href: `page3`, next_href: `page1`, desc: `last item wraps` },
  ])(`prev/next links for $desc`, ({ current, prev_href, next_href }) => {
    mount(PrevNext, { target, props: { items, current } })
    const links = target.querySelectorAll(`a`)
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute(`href`)).toBe(prev_href)
    expect(links[1].getAttribute(`href`)).toBe(next_href)
  })

  test(`custom titles`, () => {
    mount(PrevNext, {
      target,
      props: { items, current: `page2`, titles: { prev: `Back`, next: `Forward` } },
    })
    const spans = target.querySelectorAll(`span`)
    expect(spans[0].textContent).toBe(`Back`)
    expect(spans[1].textContent).toBe(`Forward`)
  })

  test(`keyboard navigation with default options`, () => {
    mount(PrevNext, { target, props: { items, current: `page2` } })

    globalThis.dispatchEvent(new KeyboardEvent(`keyup`, { key: `ArrowLeft` }))
    expect(replaceStateSpy).toHaveBeenCalledWith({}, ``, `page1`)
    expect(scrollToSpy).toHaveBeenCalledWith(100, 200)

    globalThis.dispatchEvent(new KeyboardEvent(`keyup`, { key: `ArrowRight` }))
    expect(replaceStateSpy).toHaveBeenCalledWith({}, ``, `page3`)
  })

  test(`custom node element`, () => {
    mount(PrevNext, { target, props: { items, current: `page2`, node: `div` } })
    expect(target.querySelector(`div.prev-next`)).toBeTruthy()
    expect(target.querySelector(`nav`)).toBeNull()
  })

  test.each([
    {
      test_items: [[`p1`, `L1`], [`p2`, `L2`], [`p3`, `L3`], [`p4`, `L4`]] as [
        string,
        string,
      ][],
      current: `p2`,
      prev: `p1`,
      next: `p3`,
    },
    {
      test_items: [[`/page/1`, `P1`], [`/page/2`, `P2`], [`/page/3`, `P3`], [
        `/page/4`,
        `P4`,
      ]] as [string, string][],
      current: `/page/2`,
      prev: `/page/1`,
      next: `/page/3`,
    },
  ])(
    `uses first tuple element as href (current=$current)`,
    ({ test_items, current, prev, next }) => {
      mount(PrevNext, { target, props: { items: test_items, current } })
      const links = target.querySelectorAll(`a`)
      expect(links[0].getAttribute(`href`)).toBe(prev)
      expect(links[1].getAttribute(`href`)).toBe(next)
    },
  )

  test.each([
    [`verbose` as const, [`page1`], `warn`],
    [`errors` as const, [`page1`, `page2`, `page3`], `error`],
    [`silent` as const, [`page1`], null],
  ])(`log=%s mode shows %s`, (log, test_items, level) => {
    const warn = vi.spyOn(console, `warn`)
    const error = vi.spyOn(console, `error`)

    mount(PrevNext, { target, props: { items: test_items, current: `invalid`, log } })

    if (level === `warn`) {
      expect(warn).toHaveBeenCalledWith(
        `PrevNext received 1 items - minimum of 3 expected`,
      )
    } else if (level === `error`) {
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining(`PrevNext received invalid current=invalid`),
      )
    } else {
      expect(warn).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    }

    warn.mockRestore()
    error.mockRestore()
  })

  test(`nav_options: replace_state=false uses pushState`, () => {
    mount(PrevNext, {
      target,
      props: {
        items,
        current: `page2`,
        nav_options: { replace_state: false, no_scroll: false },
      },
    })
    globalThis.dispatchEvent(new KeyboardEvent(`keyup`, { key: `ArrowLeft` }))
    expect(pushStateSpy).toHaveBeenCalledWith({}, ``, `page1`)
  })

  test(`custom keyup handler`, () => {
    const onkeyup = vi.fn(({ prev, next }) => ({ PageUp: prev[0], PageDown: next[0] }))
    mount(PrevNext, { target, props: { items, current: `page2`, onkeyup } })

    globalThis.dispatchEvent(new KeyboardEvent(`keyup`, { key: `PageUp` }))
    expect(replaceStateSpy).toHaveBeenCalledWith({}, ``, `page1`)

    globalThis.dispatchEvent(new KeyboardEvent(`keyup`, { key: `PageDown` }))
    expect(replaceStateSpy).toHaveBeenCalledWith({}, ``, `page3`)
  })

  test(`link_props and default attributes applied to links`, () => {
    const link_props = {
      class: `custom-class`,
      'data-testid': `nav-link`,
      target: `_blank`,
    }
    mount(PrevNext, { target, props: { items, current: `page2`, link_props } })

    const links = target.querySelectorAll(`a`)
    expect(links).toHaveLength(2)
    links.forEach((link) => {
      expect(link.className).toContain(`custom-class`)
      expect(link.getAttribute(`data-testid`)).toBe(`nav-link`)
      expect(link.getAttribute(`target`)).toBe(`_blank`)
      expect(link.getAttribute(`data-sveltekit-preload-data`)).toBe(`hover`)
    })
  })
})
