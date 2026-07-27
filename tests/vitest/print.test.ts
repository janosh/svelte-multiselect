import { format_print_filename, print_element } from '$lib/print'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'

// happy-dom has no window.print and never fires afterprint, so print is a spy and the
// event is dispatched by hand. Nothing else is stubbed except the measured height: the
// DOM does no layout, so every element reports height 0 and the mm arithmetic would be
// vacuous without a real number to convert.
const print_spy = vi.fn()
let original_title = ``

beforeEach(() => {
  vi.stubGlobal(`print`, print_spy)
  print_spy.mockClear()
  original_title = document.title
})
afterEach(() => {
  after_print() // the print dialog always closes eventually; let each test clean up
  vi.unstubAllGlobals()
  document.title = original_title
})

const make_target = (height_px: number): HTMLElement => {
  const node = document.createElement(`section`)
  document.body.append(node)
  // height is the only field read, so the cast stands in for the rest of DOMRect
  vi.spyOn(node, `getBoundingClientRect`).mockReturnValue({
    height: height_px,
  } as DOMRect)
  return node
}
const after_print = () => globalThis.dispatchEvent(new Event(`afterprint`))
const print_styles = () =>
  [...document.head.querySelectorAll(`style`)].filter((style) =>
    style.textContent?.includes(`@page`),
  )
const page_rule = () => /@page \{[^}]*\}/u.exec(print_styles()[0]?.textContent ?? ``)?.[0]

test(`format_print_filename appends the date, zero-padded`, () => {
  expect(format_print_filename(`report`, new Date(2026, 6, 5))).toBe(`report-2026-07-05`)
  expect(format_print_filename(`cv`, new Date(2026, 11, 31))).toBe(`cv-2026-12-31`)
})

test(`filename swaps document.title for the print and restores it after`, () => {
  document.title = `Some Page`
  print_element(make_target(500), { filename: `janosh-cv-2026-07-27` })

  expect(document.title).toBe(`janosh-cv-2026-07-27`) // browsers suggest it as the PDF name
  expect(print_spy).toHaveBeenCalledTimes(1)

  after_print()
  expect(document.title).toBe(`Some Page`)
})

test(`without a filename the title is left alone`, () => {
  document.title = `Untouched`
  print_element(make_target(500))

  expect(document.title).toBe(`Untouched`)
  expect(print_styles()).toHaveLength(0) // single_page is opt-in
  expect(print_spy).toHaveBeenCalledTimes(1)
})

test.each([
  // [height_px, options, expected @page size]
  [960, {}, `210mm 254mm`], // 10in at 96 CSS px per inch
  [960, { page_width_mm: 148 }, `148mm 254mm`], // A5 instead of the A4 default
  [960, { px_per_inch: 192 }, `210mm 127mm`], // a context reporting scaled pixels
  [100, {}, `210mm 27mm`], // 26.46mm rounded up, never down onto a second sheet
])(`single_page sizes the page to the element (%i px)`, (height, options, expected) => {
  const node = make_target(height)
  print_element(node, { single_page: true, ...options })

  expect(page_rule()).toBe(`@page { size: ${expected}; margin: 0 }`)
  expect(node.hasAttribute(`data-print-target`)).toBe(true)
  // the rules have to reach the element itself and the ancestors that would clip it
  const css = print_styles()[0].textContent ?? ``
  expect(css).toContain(`[data-print-target] { width: ${expected.split(` `)[0]}`)
  expect(css).toContain(`html, body, [data-print-target] { height: auto !important`)
})

// The injected rule outliving the print would resize every later @page on the document.
test(`afterprint removes the injected @page rule and the target marker`, () => {
  const node = make_target(960)
  document.title = `Docs`
  print_element(node, { single_page: true, filename: `docs-print` })
  expect(print_styles()).toHaveLength(1)

  after_print()

  expect(print_styles()).toHaveLength(0)
  expect(node.hasAttribute(`data-print-target`)).toBe(false)
  expect(document.title).toBe(`Docs`)

  // and the listener was one-shot: a second print's state is not torn down by a stale one
  print_element(node, { single_page: true })
  expect(print_styles()).toHaveLength(1)
})

test(`two prints in a row leave one live style, not a growing stack`, () => {
  const node = make_target(960)
  print_element(node, { single_page: true })
  after_print()
  print_element(node, { single_page: true, page_width_mm: 100 })

  expect(print_styles()).toHaveLength(1)
  expect(page_rule()).toBe(`@page { size: 100mm 254mm; margin: 0 }`)
})
