import { highlight_matches } from '$lib/attachments'
import type { HighlightRangesOptions } from '$lib/text-search'
import {
  create_burst_debounce,
  create_search_jump,
  DEFAULT_SEGMENT_SELECTOR,
  highlight_ranges,
  observe_text_mutations,
  search_text,
} from '$lib/text-search'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { doc_query } from './index'

const render = (html: string): HTMLElement => {
  document.body.innerHTML = `<main>${html}</main>`
  return doc_query(`main`)
}

// Endpoints rather than range.toString(): a range spanning node boundaries can
// stringify correctly while starting in the wrong node at a coincidentally equal
// offset, so the containers are what pin down the offset mapping.
const range_bounds = (range: Range): [string, number, string, number] => [
  range.startContainer.textContent ?? ``,
  range.startOffset,
  range.endContainer.textContent ?? ``,
  range.endOffset,
]

describe(`search_text`, () => {
  it(`matches a query straddling inline element boundaries`, () => {
    const root = render(`<p>Hello <b>wo</b>rld</p>`)

    const { matches, ranges } = search_text(root, `world`)

    expect(ranges).toHaveLength(1)
    expect(range_bounds(ranges[0])).toEqual([`wo`, 0, `rld`, 3])
    expect(matches).toEqual([doc_query(`p`)])
  })

  it.each([
    // cross-node matches the per-text-node highlight_matches attachment cannot make
    [`nested inline children`, `<p><em><b>fo</b></em><i>o</i>d</p>`, `food`, 1], // codespell:ignore fo
    [`inline wrappers without a block ancestor`, `<div>fo<b>o</b></div>`, `foo`, 1], // codespell:ignore fo
    // segment boundaries, where no visible text is continuous
    [`sibling list items`, `<ul><li>ab</li><li>cd</li></ul>`, `bc`, 0],
    [`sibling table cells`, `<table><tr><td>ab</td><td>cd</td></tr></table>`, `bc`, 0],
    [`sibling blocks`, `<div>ab</div><div>cd</div>`, `bc`, 0],
    [`a line break`, `<p>a<br>b</p>`, `ab`, 0],
    [`a replaced element`, `<p>a<img alt="">b</p>`, `ab`, 0],
    [`a nested block`, `<div>a<div>b</div>c</div>`, `ac`, 0],
    // a block nested in a block ends the outer run on both sides
    [`text after a nested block`, `<div>a<p>b</p>cd</div>`, `cd`, 1],
  ])(`%s`, (_desc, html, query, expected_count) => {
    expect(search_text(render(html), query).ranges).toHaveLength(expected_count)
  })

  it(`keeps a segment intact across empty text nodes`, () => {
    // Svelte emits empty text nodes as anchors between elements, so treating one
    // as the end of a segment would break cross-node matching in real components
    const root = render(`<p><b>fo</b>o</p>`) // codespell:ignore fo
    doc_query(`p`).lastChild?.before(document.createTextNode(``))

    expect(search_text(root, `foo`).ranges).toHaveLength(1)
  })

  it.each([
    [`empty`, ``],
    [`whitespace only`, ` \t\n `],
  ])(`returns nothing for a %s query`, (_desc, query) => {
    expect(search_text(render(`<p>content</p>`), query)).toEqual({
      matches: [],
      ranges: [],
    })
  })

  it.each([
    // offsets are computed on normalized text but must land on the original
    // characters: İ lowercases to two UTF-16 units, 😀 already is two
    [`length-changing lowercase`, `<p>İİİab</p>`, `ab`, [`İİİab`, 3, `İİİab`, 5]],
    [`astral characters`, `<p>😀ab</p>`, `ab`, [`😀ab`, 2, `😀ab`, 4]],
    [
      `case insensitivity`,
      `<p>The TEST case</p>`,
      `test`,
      [`The TEST case`, 4, `The TEST case`, 8],
    ],
    // ΟΔΟΣ lowercases to a final sigma, which readers still search for as σ
    [`final sigma`, `<p>ΟΔΟΣ</p>`, `οδοσ`, [`ΟΔΟΣ`, 0, `ΟΔΟΣ`, 4]],
    [`medial sigma query`, `<p>ΟΔΟΣ</p>`, `οδος`, [`ΟΔΟΣ`, 0, `ΟΔΟΣ`, 4]],
  ])(`maps offsets back through %s`, (_desc, html, query, expected) => {
    const [range, ...rest] = search_text(render(html), query).ranges
    expect(rest).toEqual([])
    expect(range_bounds(range)).toEqual(expected)
  })

  it.each([
    [`source-formatted markup`, `form submit`, [`form\n  `, 0, `submit`, 6]],
    [`a padded query`, `  Form   Submit  `, [`form\n  `, 0, `submit`, 6]],
  ])(`collapses whitespace runs in %s`, (_desc, query, expected) => {
    const root = render(`<p>form\n  <b>submit</b></p>`)

    const { ranges } = search_text(root, query)

    expect(ranges).toHaveLength(1)
    expect(range_bounds(ranges[0])).toEqual(expected)
  })

  it(`finds every non-overlapping occurrence and dedupes matched elements`, () => {
    const root = render(`<p>aaaa</p><p>aa</p>`)

    const { matches, ranges } = search_text(root, `aa`)

    expect(ranges.map((range) => [range.startOffset, range.endOffset])).toEqual([
      [0, 2],
      [2, 4],
      [0, 2],
    ])
    expect(matches).toHaveLength(2)
  })

  it(`skips rejected subtrees and does not join text across them`, () => {
    const root = render(`<p>ab<span class="skip">XX</span>cd</p>`)
    const node_filter = (node: Node) =>
      node.parentElement?.closest(`.skip`)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT

    expect(search_text(root, `xx`, { node_filter }).ranges).toEqual([])
    // rejecting also ends the run, so the surrounding text must not concatenate
    expect(search_text(root, `abcd`, { node_filter }).ranges).toEqual([])
    // without the filter the same three text nodes are one continuous segment
    expect(search_text(root, `abxxcd`).ranges).toHaveLength(1)
  })

  it(`honors a custom segment selector`, () => {
    const root = render(`<div class="cell">ab<b>c</b></div><div class="cell">d</div>`)

    // extending the default selector is the intended way to teach the search about
    // markup it does not know: each .cell becomes its own segment
    const segment_selector = `${DEFAULT_SEGMENT_SELECTOR}, .cell`
    expect(search_text(root, `abc`, { segment_selector }).ranges).toHaveLength(1)
    expect(search_text(root, `abcd`, { segment_selector }).ranges).toEqual([])
    // and a selector reaching above them merges the two cells into one segment
    expect(search_text(root, `abcd`, { segment_selector: `main` }).ranges).toHaveLength(1)
  })

  it(`creates ranges from the root's own document`, () => {
    const other_doc = document.implementation.createHTMLDocument(`other`)
    other_doc.body.innerHTML = `<main><p>Hello <b>wo</b>rld</p></main>`
    const root = other_doc.body.firstElementChild

    expect(root).not.toBeNull()
    if (!root) return
    const { ranges } = search_text(root, `world`)
    expect(ranges).toHaveLength(1)
    expect(ranges[0].startContainer.ownerDocument).toBe(other_doc)
  })
})

describe(`highlight_ranges`, () => {
  let registry: Map<string, unknown>
  let set_spy: ReturnType<typeof vi.fn>
  let delete_spy: ReturnType<typeof vi.fn>

  // happy-dom implements neither CSS.highlights nor the Highlight constructor, so
  // both are stubbed: the registry as a plain Map with spied set/delete, and
  // Highlight as a class recording the ranges it was constructed with.
  beforeEach(() => {
    registry = new Map()
    set_spy = vi.fn((key: string, value: unknown) => registry.set(key, value))
    delete_spy = vi.fn((key: string) => registry.delete(key))
    vi.stubGlobal(`CSS`, {
      highlights: {
        get: (key: string) => registry.get(key),
        set: set_spy,
        delete: delete_spy,
        clear: () => registry.clear(),
      },
    })
    vi.stubGlobal(
      `Highlight`,
      class MockHighlight {
        ranges: Range[]
        constructor(...ranges: Range[]) {
          this.ranges = ranges
        }
      },
    )
  })

  afterEach(() => vi.unstubAllGlobals())

  const installed_ranges = (css_class = `text-search-match`): Range[] => {
    const highlight = registry.get(css_class)
    if (!(highlight instanceof globalThis.Highlight)) {
      throw new Error(`no highlight installed for ${css_class}, got ${highlight}`)
    }
    const { ranges } = highlight as unknown as { ranges: Range[] }
    return ranges
  }

  const search = (html: string, query: string): Range[] =>
    search_text(render(html), query).ranges

  it(`installs matched ranges and removes them on release`, () => {
    const ranges = search(`<p>Hello <b>wo</b>rld</p>`, `world`)

    const release = highlight_ranges(ranges)

    expect(installed_ranges()).toEqual(ranges)
    expect(set_spy).toHaveBeenCalledExactlyOnceWith(
      `text-search-match`,
      expect.any(globalThis.Highlight),
    )
    release?.()
    expect(registry.has(`text-search-match`)).toBe(false)
    expect(delete_spy).toHaveBeenCalledExactlyOnceWith(`text-search-match`)
  })

  it(`unions ranges from several owners until the last releases`, () => {
    const first = search(`<p>alpha</p>`, `alpha`)
    const second = search(`<p>beta</p>`, `beta`)

    const release_first = highlight_ranges(first)
    const release_second = highlight_ranges(second)
    expect(installed_ranges()).toEqual([...first, ...second])

    release_first?.()
    expect(installed_ranges()).toEqual(second)
    release_first?.() // releasing twice must not drop the other owner
    expect(installed_ranges()).toEqual(second)

    release_second?.()
    expect(registry.has(`text-search-match`)).toBe(false)
  })

  it(`keeps separate css classes independent`, () => {
    const first = search(`<p>alpha</p>`, `alpha`)
    const second = search(`<p>beta</p>`, `beta`)

    highlight_ranges(first, { css_class: `one` })
    const release = highlight_ranges(second, { css_class: `two` })

    expect(installed_ranges(`one`)).toEqual(first)
    release?.()
    expect(installed_ranges(`one`)).toEqual(first)
    expect(registry.has(`two`)).toBe(false)
  })

  it(`restores a pre-existing highlight it did not install`, () => {
    const foreign = new globalThis.Highlight()
    registry.set(`text-search-match`, foreign)

    const release = highlight_ranges(search(`<p>alpha</p>`, `alpha`))
    expect(registry.get(`text-search-match`)).not.toBe(foreign)

    release?.()
    expect(registry.get(`text-search-match`)).toBe(foreign)
  })

  it(`yields the name once another writer takes it over`, () => {
    const ranges = search(`<p>alpha</p>`, `alpha`)
    const release_first = highlight_ranges(ranges)
    const usurper = new globalThis.Highlight()
    registry.set(`text-search-match`, usurper)

    // a second owner joining must not stomp the external writer
    const release_second = highlight_ranges(ranges)
    expect(registry.get(`text-search-match`)).toBe(usurper)

    release_first?.()
    release_second?.()
    expect(registry.get(`text-search-match`)).toBe(usurper)
  })

  it.each<[string, HighlightRangesOptions, () => void]>([
    [`disabled`, { disabled: true }, () => {}],
    [`CSS.highlights is missing`, {}, () => vi.stubGlobal(`CSS`, undefined)],
    [`Highlight is missing`, {}, () => vi.stubGlobal(`Highlight`, undefined)],
  ])(`returns undefined when %s`, (_desc, options, prepare) => {
    const ranges = search(`<p>alpha</p>`, `alpha`)
    prepare()

    expect(highlight_ranges(ranges, options)).toBeUndefined()
    expect(set_spy).not.toHaveBeenCalled()
  })

  // The reconciliation this module is designed for: highlight_matches keeps its own
  // owner bookkeeping in attachments.ts. Sharing a css class between the two must
  // stay safe until they are merged onto one implementation.
  it(`unions ranges with the highlight_matches attachment on a shared css class`, () => {
    const root = render(`<p>Hello <b>wo</b>rld</p>`)
    const attachment_cleanup = highlight_matches({
      query: `Hello`,
      css_class: `shared`,
      scroll_to_match: false,
    })(root)
    expect(installed_ranges(`shared`)).toHaveLength(1)

    const release = highlight_ranges(search_text(root, `world`).ranges, {
      css_class: `shared`,
    })
    // both owners share one store, so the name holds their union, not the last write
    expect(installed_ranges(`shared`)).toHaveLength(2)

    // releasing one owner leaves the other's range installed rather than wiping it
    release?.()
    expect(installed_ranges(`shared`)).toHaveLength(1)
    attachment_cleanup?.()
    expect(registry.has(`shared`)).toBe(false)
  })
})

// observe_text_mutations is a MutationObserver wired straight to create_burst_debounce,
// so the two share a clock and are exercised together
describe(`observe_text_mutations and create_burst_debounce`, () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // happy-dom delivers mutation records in a microtask, which fake timers leave
  // alone, so awaiting the async advance runs both the observer and the debounce
  const mutate = async (node: Element, advance_ms: number) => {
    node.append(document.createElement(`span`))
    await vi.advanceTimersByTimeAsync(advance_ms)
  }

  it(`collapses a burst of mutations into one call`, async () => {
    const root = render(`<p>content</p>`)
    const on_mutation = vi.fn()
    const stop = observe_text_mutations(root, on_mutation, { debounce_ms: 50 })

    for (let idx = 0; idx < 3; idx++) await mutate(root, 20)
    expect(on_mutation).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(50)
    expect(on_mutation).toHaveBeenCalledTimes(1)
    stop()
  })

  it(`fires at the max wait ceiling during a sustained burst`, async () => {
    const root = render(`<p>content</p>`)
    const on_mutation = vi.fn()
    const stop = observe_text_mutations(root, on_mutation, {
      debounce_ms: 50,
      max_wait_ms: 120,
    })

    // each mutation would reset a plain debounce, so without the ceiling these
    // 6 x 20 ms steps would never let the callback run
    for (let idx = 0; idx < 6; idx++) await mutate(root, 20)
    expect(on_mutation).toHaveBeenCalledTimes(1)
    stop()
  })

  it(`stops observing and cancels a pending call after cleanup`, async () => {
    const root = render(`<p>content</p>`)
    const on_mutation = vi.fn()
    const stop = observe_text_mutations(root, on_mutation, { debounce_ms: 50 })

    await mutate(root, 10)
    stop()

    await vi.advanceTimersByTimeAsync(200)
    expect(on_mutation).not.toHaveBeenCalled()

    await mutate(root, 200)
    expect(on_mutation).not.toHaveBeenCalled()
  })

  it(`cancel starts the next burst's max-wait window over`, () => {
    const callback = vi.fn()
    const { trigger, cancel } = create_burst_debounce(callback, {
      debounce_ms: 50,
      max_wait_ms: 120,
    })

    // spend most of one burst's ceiling, then abandon the burst
    trigger()
    vi.advanceTimersByTime(40)
    trigger()
    vi.advanceTimersByTime(40)
    cancel()
    vi.advanceTimersByTime(200)
    expect(callback).not.toHaveBeenCalled()

    // carrying the cancelled burst's start forward would leave the ceiling already
    // spent, collapsing the debounce to zero and firing on the first trigger
    trigger()
    vi.advanceTimersByTime(49)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledOnce()
  })
})

describe(`create_search_jump`, () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it(`marks and scrolls the target, then clears itself`, () => {
    const root = render(`<p>first</p><p>second</p>`)
    const [first, second] = Array.from(root.querySelectorAll(`p`))
    first.scrollIntoView = vi.fn()
    second.scrollIntoView = vi.fn()
    const on_clear = vi.fn()
    const jump = create_search_jump({ duration_ms: 500, on_clear })

    jump.start(first)
    expect(first.classList.contains(`search-match-jump`)).toBe(true)
    expect(first.scrollIntoView).toHaveBeenCalledExactlyOnceWith({
      block: `center`,
      inline: `nearest`,
    })

    // a second jump unmarks the previous element without reporting a clear
    jump.start(second)
    expect(first.classList.contains(`search-match-jump`)).toBe(false)
    expect(second.classList.contains(`search-match-jump`)).toBe(true)
    expect(on_clear).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(second.classList.contains(`search-match-jump`)).toBe(false)
    expect(on_clear).toHaveBeenCalledTimes(1)
  })

  it(`clear() removes the mark early and cancels the timeout`, () => {
    const root = render(`<p>first</p>`)
    const paragraph = doc_query(`p`)
    paragraph.scrollIntoView = vi.fn()
    const on_clear = vi.fn()
    const jump = create_search_jump({ class_name: `flash`, on_clear })

    jump.start(paragraph)
    jump.clear()
    expect(paragraph.classList.contains(`flash`)).toBe(false)
    expect(on_clear).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5000)
    expect(on_clear).toHaveBeenCalledTimes(1)
    expect(root.querySelector(`.flash`)).toBeNull()
  })

  it.each([
    [`a separate scroll target`, true, false],
    [`scrolling disabled`, false, true],
  ])(`supports %s`, (_desc, use_scroll_target, disable_scroll) => {
    render(`<p id="match">first</p><section id="wrapper"></section>`)
    const match = doc_query(`#match`)
    const wrapper = doc_query(`#wrapper`)
    match.scrollIntoView = vi.fn()
    wrapper.scrollIntoView = vi.fn()
    const jump = create_search_jump()

    jump.start(match, {
      scroll_target: use_scroll_target ? wrapper : undefined,
      scroll: disable_scroll ? false : { block: `start` },
    })

    // the class always lands on the match, never on the scroll target
    expect(match.classList.contains(`search-match-jump`)).toBe(true)
    expect(wrapper.classList.contains(`search-match-jump`)).toBe(false)
    expect(match.scrollIntoView).not.toHaveBeenCalled()
    expect(wrapper.scrollIntoView).toHaveBeenCalledTimes(use_scroll_target ? 1 : 0)
  })

  it(`tolerates a null element`, () => {
    const on_clear = vi.fn()
    const jump = create_search_jump({ on_clear })

    jump.start(null)
    vi.advanceTimersByTime(2000)
    expect(document.querySelector(`.search-match-jump`)).toBeNull()
    expect(on_clear).toHaveBeenCalledOnce() // a jump to nothing still ends like any other
  })
})
