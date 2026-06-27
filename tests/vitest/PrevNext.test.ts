import { PrevNext } from '$lib'
import { mount, type ComponentProps } from 'svelte'
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import TestSnippetHarness from './TestSnippetHarness.svelte'

const items = [`page1`, `page2`, `page3`, `page4`]

describe(`PrevNext`, () => {
  let target: HTMLElement
  let replaceStateSpy: ReturnType<typeof vi.fn>
  let pushStateSpy: ReturnType<typeof vi.fn>
  let scrollToSpy: ReturnType<typeof vi.fn>
  const link_hrefs = () =>
    [...target.querySelectorAll(`a`)].map((link) => link.getAttribute(`href`))
  const keyup = (key: string, event_target: EventTarget = globalThis) =>
    event_target.dispatchEvent(new KeyboardEvent(`keyup`, { key, bubbles: true }))
  const mount_prev_next = (props: ComponentProps<typeof PrevNext>) =>
    mount(PrevNext, { target, props })
  const mount_snippet_harness = (props: ComponentProps<typeof TestSnippetHarness>) =>
    mount(TestSnippetHarness, { target, props })
  const child_snippets = () => [
    ...target.querySelectorAll<HTMLElement>(`[data-testid="prevnext-child"]`),
  ]

  beforeEach(() => {
    target = document.body
    replaceStateSpy = vi.fn()
    pushStateSpy = vi.fn()
    scrollToSpy = vi.fn()

    Object.defineProperty(globalThis, `history`, {
      value: { replaceState: replaceStateSpy, pushState: pushStateSpy },
    })
    Object.defineProperty(globalThis, `scrollTo`, { value: scrollToSpy })
    Object.defineProperty(globalThis, `scrollX`, { value: 100, writable: true })
    Object.defineProperty(globalThis, `scrollY`, { value: 200, writable: true })
  })

  test(`renders nothing with less than min_items`, () => {
    mount_prev_next({ items: [`page1`, `page2`], current: `page1` })
    expect(target.querySelector(`nav`)).toBeNull()
  })

  test.each([
    [`middle item`, `page2`, [`page1`, `page3`]],
    [`first item wraps`, `page1`, [`page4`, `page2`]],
    [`last item wraps`, `page4`, [`page3`, `page1`]],
  ] as const)(`prev/next links for %s`, (_desc, current, expected_hrefs) => {
    mount_prev_next({ items, current })
    expect(link_hrefs()).toEqual(expected_hrefs)
  })

  test.each([
    [`custom`, { prev: `Back`, next: `Forward` }, [`Back`, `Forward`]],
    [`empty`, { prev: ``, next: `` }, []],
  ] as const)(`%s titles`, (_label, titles, expected_labels) => {
    mount_prev_next({ items, current: `page2`, titles })
    expect([...target.querySelectorAll(`span`)].map((span) => span.textContent)).toEqual(
      expected_labels,
    )
    expect(target.querySelectorAll(`a`)).toHaveLength(2)
  })

  test(`keyboard navigation with default options`, () => {
    mount_prev_next({ items, current: `page2` })

    keyup(`ArrowLeft`)
    expect(replaceStateSpy).toHaveBeenCalledWith({}, ``, `page1`)
    expect(scrollToSpy).toHaveBeenCalledWith(100, 200)

    keyup(`ArrowRight`)
    expect(replaceStateSpy).toHaveBeenCalledWith({}, ``, `page3`)
  })

  test.each([
    [`onkeyup=null`, { items, current: `page2`, onkeyup: null }, `Home`],
    [`too few items`, { items: [`page1`, `page2`], current: `page1` }, `Home`],
    [`unmapped key`, { items, current: `page2` }, `Home`],
  ])(`keyboard navigation ignores %s`, (_label, props, key) => {
    mount_prev_next(props)

    keyup(key)

    for (const spy of [replaceStateSpy, pushStateSpy, scrollToSpy]) {
      expect(spy).not.toHaveBeenCalled()
    }
  })

  test.each([
    [`no_scroll=false`, { replace_state: true, no_scroll: false }, `replace`, `NoScroll`],
    [`replace_state=false`, { replace_state: false, no_scroll: false }, `push`, `Push`],
  ] as const)(`nav_options: %s`, (_label, nav_options, history_method, key) => {
    mount_prev_next({
      items,
      current: `page2`,
      nav_options,
      onkeyup: ({ prev }: { prev: [string, unknown] }) => ({ [key]: prev[0] }),
    })

    keyup(key)

    const history_spy = history_method === `replace` ? replaceStateSpy : pushStateSpy
    expect(history_spy).toHaveBeenCalledWith({}, ``, `page1`)
    expect(scrollToSpy).not.toHaveBeenCalled()
  })

  test.each([
    [`input`, () => document.createElement(`input`)],
    [`textarea`, () => document.createElement(`textarea`)],
    [`select`, () => document.createElement(`select`)],
    [
      `contenteditable`,
      () => Object.assign(document.createElement(`div`), { contentEditable: `true` }),
    ],
  ])(`keyboard navigation ignores events from %s`, (_label, create_target) => {
    mount_prev_next({ items, current: `page2` })
    const editable_target = create_target()
    target.append(editable_target)

    keyup(`ArrowLeft`, editable_target)

    expect(replaceStateSpy).not.toHaveBeenCalled()
    expect(pushStateSpy).not.toHaveBeenCalled()
  })

  test(`custom node element`, () => {
    mount_prev_next({ items, current: `page2`, node: `div` })
    expect(target.querySelector(`div.prev-next`)).toBeInstanceOf(HTMLDivElement)
    expect(target.querySelector(`nav`)).toBeNull()
  })

  test.each([
    [
      `p2`,
      [
        [`p1`, `L1`],
        [`p2`, `L2`],
        [`p3`, `L3`],
        [`p4`, `L4`],
      ],
      [`p1`, `p3`],
    ],
    [
      `/page/2`,
      [
        [`/page/1`, `P1`],
        [`/page/2`, `P2`],
        [`/page/3`, `P3`],
        [`/page/4`, `P4`],
      ],
      [`/page/1`, `/page/3`],
    ],
  ] satisfies [string, [string, string][], string[]][])(
    `uses first tuple element as href (current=%s)`,
    (current, test_items, expected_hrefs) => {
      mount_prev_next({ items: test_items, current })
      expect(link_hrefs()).toEqual(expected_hrefs)
    },
  )

  test.each([
    [`verbose` as const, [`page1`], `warn`],
    [`errors` as const, [`page1`, `page2`, `page3`], `error`],
    [`silent` as const, [`page1`], null],
  ])(`log=%s mode shows %s`, (log, test_items, level) => {
    const warn = vi.spyOn(console, `warn`).mockImplementation(() => {})
    const error = vi.spyOn(console, `error`).mockImplementation(() => {})

    mount_prev_next({ items: test_items, current: `invalid`, log })

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

  test(`custom keyup handler`, () => {
    const onkeyup = vi.fn(({ prev, next }) => ({ PageUp: prev[0], PageDown: next[0] }))
    mount_prev_next({ items, current: `page2`, onkeyup })

    for (const [key, href] of [
      [`PageUp`, `page1`],
      [`PageDown`, `page3`],
    ] as const) {
      keyup(key)
      expect(replaceStateSpy).toHaveBeenCalledWith({}, ``, href)
    }
  })

  test(`children snippet receives index and total`, () => {
    mount_snippet_harness({ component: `prev-next-children`, items, current: `page2` })

    expect(
      child_snippets().map((snippet) => [
        snippet.dataset.kind,
        snippet.dataset.index,
        snippet.dataset.total,
      ]),
    ).toEqual([
      [`prev`, `1`, `4`],
      [`next`, `1`, `4`],
    ])
  })

  test(`named prev, between, and next snippets render`, () => {
    mount_snippet_harness({ component: `prev-next-named`, items, current: `page2` })

    const prev = target.querySelector<HTMLElement>(`[data-testid="prevnext-prev"]`)
    const next = target.querySelector<HTMLElement>(`[data-testid="prevnext-next"]`)
    expect(
      [prev, next].map((snippet) => [
        snippet?.getAttribute(`href`),
        snippet?.dataset.index,
        snippet?.dataset.total,
      ]),
    ).toEqual([
      [`page1`, `1`, `4`],
      [`page3`, `1`, `4`],
    ])
    expect(target.querySelector(`[data-testid="prevnext-between"]`)?.textContent).toBe(
      `between`,
    )
  })

  test(`children snippet passes index=undefined when current is invalid`, () => {
    mount_snippet_harness({
      component: `prev-next-children`,
      items,
      current: `nonexistent`,
      log: `silent`,
    })

    const snippets = child_snippets()
    expect(snippets).toHaveLength(2)
    expect(snippets[0].dataset.index).toBeUndefined()
    expect(snippets[1].dataset.index).toBeUndefined()
    expect(snippets[0].dataset.total).toBe(`4`)
  })

  test(`link_props and default attributes applied to links`, () => {
    const link_props = {
      class: `custom-class`,
      'data-testid': `nav-link`,
      target: `_blank`,
    }
    mount_prev_next({ items, current: `page2`, link_props })

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
