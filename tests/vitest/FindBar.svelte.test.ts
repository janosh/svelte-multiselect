import { create_find_state } from '$lib/find-in-page.svelte'
import type { FindOptions } from '$lib/find-in-page.svelte'
import FindBar from '$lib/FindBar.svelte'
import type { ComponentProps } from 'svelte'
import { mount, tick, unmount } from 'svelte'
import { describe, expect, onTestFinished, test, vi } from 'vite-plus/test'
import { doc_query, press_key } from './index'

type Props = ComponentProps<typeof FindBar>

const render_root = (html: string): HTMLElement => {
  document.body.innerHTML = `<main>${html}</main><div id="bar"></div>`
  return doc_query(`main`)
}

const mount_bar = (html: string, extra: Partial<Props> = {}) => {
  const root = render_root(html)
  const on_close = vi.fn()
  const bar = mount(FindBar, {
    target: doc_query(`#bar`),
    props: { root, on_close, ...extra },
  })
  return { bar, root, on_close }
}

const input = () => doc_query<HTMLInputElement>(`.find-bar input`)
const status = () => doc_query(`.find-status`).textContent?.trim()
const nav_button = (name: `Previous` | `Next`) =>
  doc_query<HTMLButtonElement>(`.find-bar button[aria-label="${name} match"]`)

// Typing goes through the real input event, so the component's own async update runs
const type_query = async (query: string) => {
  const element = input()
  element.value = query
  element.dispatchEvent(new Event(`input`, { bubbles: true }))
  await tick()
  await tick()
}

const jumped = () => document.querySelector(`.search-match-jump`)?.textContent

describe(`FindBar`, () => {
  // Focus is the caller's call, not the component's: a bar rendered alongside its
  // content (rather than opened on a hotkey) must not steal focus on mount.
  test(`focus_input focuses and selects the query, and mounting does not`, async () => {
    const { bar } = mount_bar(`<p>alpha</p>`)
    await type_query(`alpha`)
    expect(document.activeElement).not.toBe(input())

    bar.focus_input()
    expect(document.activeElement).toBe(input())
    expect([input().selectionStart, input().selectionEnd]).toEqual([0, `alpha`.length])
  })

  test(`counts matches, walks them with the arrows and wraps at both ends`, async () => {
    mount_bar(`<p>alpha</p><p>beta alpha</p><ul><li>alpha</li></ul>`)
    expect(status()).toBe(``) // quiet until there is something to say

    await type_query(`alpha`)
    expect(status()).toBe(`1 of 3`)
    expect(jumped()).toBe(`alpha`)

    nav_button(`Next`).click()
    await tick()
    expect(status()).toBe(`2 of 3`)
    expect(jumped()).toBe(`beta alpha`)

    // wrap forwards off the end, then backwards off the front
    for (const _step of [0, 1]) nav_button(`Next`).click()
    await tick()
    expect(status()).toBe(`1 of 3`)
    nav_button(`Previous`).click()
    await tick()
    expect(status()).toBe(`3 of 3`)
  })

  test.each([
    [`Enter`, {}, `2 of 3`],
    // from the first match a backward step wraps around to the last
    [`Shift+Enter`, { shiftKey: true }, `3 of 3`],
  ])(`%s steps the cursor`, async (_case, init, expected) => {
    mount_bar(`<p>one hit</p><p>two hit</p><p>three hit</p>`)
    await type_query(`hit`)
    expect(status()).toBe(`1 of 3`)

    press_key(input(), `Enter`, init)
    await tick()
    expect(status()).toBe(expected)
  })

  test(`reports no matches and disables the arrows`, async () => {
    mount_bar(`<p>alpha</p>`)
    await type_query(`omega`)

    expect(status()).toBe(`No matches`)
    expect([nav_button(`Previous`).disabled, nav_button(`Next`).disabled]).toEqual([
      true,
      true,
    ])
  })

  test.each([
    [`the close button`, () => doc_query<HTMLButtonElement>(`.find-close`).click()],
    [`Escape`, () => press_key(input(), `Escape`)],
  ])(`%s closes the bar`, async (_case, close) => {
    const { on_close } = mount_bar(`<p>alpha</p>`)
    await type_query(`alpha`)

    close()
    expect(on_close).toHaveBeenCalledOnce()
  })

  test(`Escape does not reach a handler on the surface being searched`, async () => {
    mount_bar(`<p>alpha</p>`)
    const outer = vi.fn()
    document.body.addEventListener(`keydown`, outer)

    const event = press_key(input(), `Escape`)
    document.body.removeEventListener(`keydown`, outer)
    expect(outer).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true)
  })

  test(`opens a collapsed <details> holding the match it jumps to`, async () => {
    mount_bar(`<details><summary>head</summary><p>buried alpha</p></details>`)
    const details = doc_query<HTMLDetailsElement>(`details`)
    expect(details.open).toBe(false)

    await type_query(`buried`)
    expect(details.open).toBe(true)
  })

  test(`labels the region, the input and the close button from one prop`, () => {
    mount_bar(`<p>alpha</p>`, { label: `dashboard` })

    expect(doc_query(`.find-bar`).getAttribute(`aria-label`)).toBe(`Find in dashboard`)
    expect(input().placeholder).toBe(`Find in dashboard…`)
    expect(doc_query(`.find-close`).getAttribute(`aria-label`)).toBe(
      `Close dashboard search`,
    )
  })

  // Four copies of the query: plain, aria-hidden, sr-only and .skip. The last is only
  // excluded by also_ignore, which adds to the always-excluded two rather than
  // replacing them.
  test.each([
    [`nothing extra`, undefined, `1 of 2`],
    [`also_ignore`, `.skip`, `1 of 1`],
  ])(`skips the never-findable selectors plus %s`, async (_case, also_ignore, count) => {
    mount_bar(
      `<p>alpha</p><p aria-hidden="true">alpha</p><p class="sr-only">alpha</p>` +
        `<p class="skip">alpha</p>`,
      { also_ignore },
    )
    await type_query(`alpha`)
    expect(status()).toBe(count)
  })

  // only_within states what IS searchable, for a surface whose chrome is too open-ended
  // to enumerate as exceptions; the always-excluded selectors still apply inside it.
  test.each([
    [`without only_within`, undefined, `1 of 3`],
    [`with only_within`, `.content`, `1 of 1`],
  ])(`%s`, async (_case, only_within, count) => {
    mount_bar(
      `<div class="content"><p>alpha</p><p aria-hidden="true">alpha</p></div>` +
        `<nav><p>alpha</p></nav><footer><p>alpha</p></footer>`,
      { only_within },
    )
    await type_query(`alpha`)
    expect(status()).toBe(count)
  })
})

describe(`create_find_state`, () => {
  const setup = (html: string, options: FindOptions = {}) => {
    const root = render_root(html)
    return { root, find: create_find_state(() => options) }
  }

  test(`setting a query resets navigation and refresh recomputes matches`, () => {
    const { root, find } = setup(`<p>alpha</p><p>alpha two</p>`)

    find.query = `alpha`
    expect(find.current_idx).toBe(-1)
    find.refresh(root)
    expect(find.matches).toHaveLength(2)
    expect(find.status).toBe(`1 of 2`) // idx -1 reads as the first match

    find.jump_to(1)
    expect(find.current_idx).toBe(1)
    find.query = `two`
    expect(find.current_idx).toBe(-1)
  })

  // step() only ever produces -1..length, but jump_to is public and its wrap has to
  // hold for anything: a bare `% length` returns negatives below -length
  test.each([
    [-5, 1],
    [-3, 0],
    [-1, 2],
    [4, 1],
  ])(`jump_to(%i) wraps into range`, (idx, expected) => {
    const { root, find } = setup(`<p>a x</p><p>b x</p><p>c x</p>`)
    find.query = `x`
    find.refresh(root)

    find.jump_to(idx)
    expect(find.current_idx).toBe(expected)
  })

  test(`refresh with no root clears the matches`, () => {
    const { root, find } = setup(`<p>alpha</p>`)
    find.query = `alpha`
    find.refresh(root)
    expect(find.matches).toHaveLength(1)

    find.refresh(undefined)
    expect(find.matches).toEqual([])
    expect(find.status).toBe(`No matches`)
  })

  test(`keeps the cursor on the same element when a re-search preserves it`, () => {
    const { root, find } = setup(`<p>alpha one</p><p>alpha two</p><p>alpha three</p>`)
    find.query = `alpha`
    find.refresh(root)
    find.jump_to(2)
    const current = find.matches[2]

    // drop an earlier match; the cursor follows its element to the new index
    doc_query(`main p`).remove()
    find.refresh(root)
    expect(find.current_idx).toBe(1)
    expect(find.matches[find.current_idx]).toBe(current)
  })

  test(`clamps the cursor when its element is gone`, () => {
    const { root, find } = setup(`<p>alpha one</p><p>alpha two</p>`)
    find.query = `alpha`
    find.refresh(root)
    find.jump_to(1)

    root.querySelectorAll(`p`)[1].remove()
    find.refresh(root)
    expect(find.current_idx).toBe(0)
  })

  test(`before_search runs ahead of the search, so its [hidden] writes take effect`, () => {
    const { root, find } = setup(`<p>alpha one</p><p id="two">alpha two</p>`, {
      before_search: (query) => {
        doc_query(`#two`).hidden = query === `alpha`
      },
    })

    find.query = `alpha`
    find.refresh(root)
    expect(find.matches).toHaveLength(1)
  })

  test(`observe re-searches after the DOM settles and jumps to a first match`, async () => {
    vi.useFakeTimers()
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const { root, find } = setup(`<p>nothing here</p>`)
    find.query = `late`
    find.refresh(root)
    expect(find.matches).toEqual([])

    const stop = find.observe(root)
    root.append(Object.assign(document.createElement(`p`), { textContent: `late hit` }))
    await vi.advanceTimersByTimeAsync(200)

    expect(find.matches).toHaveLength(1)
    expect(find.current_idx).toBe(0)
    stop()
  })

  // happy-dom implements neither CSS.highlights nor the Highlight constructor
  const stub_highlight_registry = (): Map<string, unknown> => {
    const registry = new Map<string, unknown>()
    vi.stubGlobal(`CSS`, {
      highlights: {
        get: (key: string) => registry.get(key),
        set: (key: string, value: unknown) => registry.set(key, value),
        delete: (key: string) => registry.delete(key),
      },
    })
    vi.stubGlobal(
      `Highlight`,
      class {
        readonly ranges: readonly Range[]
        constructor(...ranges: Range[]) {
          this.ranges = ranges
        }
      },
    )
    onTestFinished(() => {
      vi.unstubAllGlobals()
    })
    return registry
  }

  test(`registers and releases ranges under the configured highlight name`, () => {
    const registry = stub_highlight_registry()
    const { root, find } = setup(`<p>alpha</p>`, { css_class: `custom-find` })

    find.query = `alpha`
    find.refresh(root)
    expect(registry.has(`custom-find`)).toBe(true)

    find.release_highlight()
    expect(registry.has(`custom-find`)).toBe(false)
  })

  test(`a mounted FindBar stops observing and drops its highlight on unmount`, async () => {
    const registry = stub_highlight_registry()
    const disconnect = vi.spyOn(MutationObserver.prototype, `disconnect`)
    const { bar, root } = mount_bar(`<p>alpha</p>`)
    await type_query(`alpha`)
    expect(registry.has(`find-match`)).toBe(true)

    await unmount(bar)
    await tick()
    expect(disconnect).toHaveBeenCalled()
    // a stranded owner would keep painting matches over content nothing is searching
    expect(registry.has(`find-match`)).toBe(false)
    expect(root.isConnected).toBe(true) // the searched subtree is left alone
  })
})
