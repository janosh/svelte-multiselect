import { PrevNext } from '$lib'
import { mount, type ComponentProps, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
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
  // clearing document.body leaves <svelte:window> keyup listeners attached, so leaked
  // instances keep navigating and skew call counts
  const mounted: Record<string, unknown>[] = []
  const mount_prev_next = (props: ComponentProps<typeof PrevNext>) => {
    mounted.push(mount(PrevNext, { target, props }))
  }
  const mount_snippet_harness = (props: ComponentProps<typeof TestSnippetHarness>) => {
    mounted.push(mount(TestSnippetHarness, { target, props }))
  }
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

  afterEach(() => {
    for (const instance of mounted) void unmount(instance)
    mounted.length = 0
  })

  test.each<[string, ComponentProps<typeof PrevNext>, number]>([
    [`fewer items than the default min_items`, { items: [`page1`, `page2`] }, 0],
    [`fewer items than a custom min_items`, { items, min_items: 5 }, 0],
    [`exactly min_items`, { items: [`page1`, `page2`], min_items: 2 }, 2],
  ])(`min_items gate: %s renders %d links`, (_desc, props, expected_links) => {
    mount_prev_next({ ...props, current: `page1` })
    expect(target.querySelectorAll(`a`)).toHaveLength(expected_links)
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
    expect(replaceStateSpy).toHaveBeenCalledTimes(2)
    expect(pushStateSpy).not.toHaveBeenCalled() // replace_state defaults to true
  })

  test.each([
    // the first two press a mapped key, so they fail if their guard stops working
    [`onkeyup=null`, { items, current: `page2`, onkeyup: null }, `ArrowLeft`],
    [`too few items`, { items: [`page1`, `page2`], current: `page1` }, `ArrowLeft`],
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
    expect(link_hrefs()).toEqual([`page1`, `page3`]) // links still render inside the div
  })

  test(`uses tuple href and label`, () => {
    const tuple_items: [string, string][] = [1, 2, 3, 4].map((num) => [
      `/page/${num}`,
      `P${num}`,
    ])
    mount_prev_next({ items: tuple_items, current: `/page/2` })
    expect(link_hrefs()).toEqual([`/page/1`, `/page/3`])
    expect(
      [...target.querySelectorAll(`a`)].map((link) => link.textContent?.trim()),
    ).toEqual([`P1`, `P3`])
  })

  const few_items_warning = `PrevNext received 1 items - minimum of 3 expected`
  const bad_current_error = `PrevNext received invalid current=invalid, expected one of page1,page2,page3`
  // too-few-items warnings are verbose-only, invalid-current errors are errors-only
  test.each([
    [`verbose` as const, [`page1`], [few_items_warning], []],
    [`errors` as const, [`page1`, `page2`, `page3`], [], [bad_current_error]],
    [`silent` as const, [`page1`], [], []],
  ])(`log=%s mode`, (log, test_items, expected_warns, expected_errors) => {
    const warn = vi.spyOn(console, `warn`).mockImplementation(() => {})
    const error = vi.spyOn(console, `error`).mockImplementation(() => {})

    mount_prev_next({ items: test_items, current: `invalid`, log })

    expect(warn.mock.calls.flat()).toEqual(expected_warns)
    expect(error.mock.calls.flat()).toEqual(expected_errors)

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
    expect(replaceStateSpy).toHaveBeenCalledTimes(2)
    // the custom handler receives the resolved prev/next tuples
    expect(onkeyup).toHaveBeenCalledWith({
      prev: [`page1`, `page1`],
      next: [`page3`, `page3`],
    })
  })

  test.each([
    [`page2`, `1`],
    [`nonexistent`, undefined], // index is not rendered when current is not among items
  ])(`children snippet receives kind, index and total (current=%s)`, (current, index) => {
    const component = `prev-next-children`
    mount_snippet_harness({ component, items, current, log: `silent` })

    expect(
      child_snippets().map((snippet) => [
        snippet.dataset.kind,
        snippet.dataset.index,
        snippet.dataset.total,
      ]),
    ).toEqual([
      [`prev`, index, `4`],
      [`next`, index, `4`],
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

  test(`link_props and default attributes applied to links`, () => {
    const link_props = {
      class: `custom-class`,
      'data-testid': `nav-link`,
      target: `_blank`,
    }
    mount_prev_next({ items, current: `page2`, link_props })

    const link_attrs = [...target.querySelectorAll(`a`)].map((link) => [
      link.classList.contains(`custom-class`),
      link.getAttribute(`data-testid`),
      link.getAttribute(`target`),
      link.getAttribute(`data-sveltekit-preload-data`), // component default
    ])
    const expected = [true, `nav-link`, `_blank`, `hover`]
    expect(link_attrs).toEqual([expected, expected])
  })
})
