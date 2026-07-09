import { mount, tick } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'

import MultiSelect from '$lib'
import type { MultiSelectProps, PortalParams } from '$lib/types'

import { doc_query } from './index'

// happy-dom has no real layout engine, so stub getBoundingClientRect on the
// outer div, offsetHeight on the portalled dropdown, and the viewport height
function stub_layout({
  trigger_rect,
  dropdown_height,
  viewport_height,
}: {
  trigger_rect: { top: number; bottom: number }
  dropdown_height: number
  viewport_height: number
}): HTMLUListElement {
  const { top, bottom } = trigger_rect
  const rect = {
    top,
    bottom,
    left: 10,
    right: 210,
    width: 200,
    height: bottom - top,
    x: 10,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
  vi.spyOn(doc_query(`div.multiselect`), `getBoundingClientRect`).mockReturnValue(rect)
  const dropdown = doc_query<HTMLUListElement>(`body > ul.options`)
  Object.defineProperty(dropdown, `offsetHeight`, {
    value: dropdown_height,
    configurable: true,
  })
  Object.defineProperty(globalThis, `innerHeight`, {
    value: viewport_height,
    configurable: true,
    writable: true,
  })
  return dropdown
}

async function mount_with_portal(placement?: PortalParams[`placement`]) {
  mount(MultiSelect, {
    target: document.body,
    props: {
      options: [1, 2, 3],
      open: true,
      portal: { active: true, placement },
    },
  })
  await tick()
}

// `top` positions the dropdown's margin edge, so the action subtracts the
// computed margin-top when placing above — mirror that in expected values
function expected_top_style(
  expected_placement: `top` | `bottom`,
  trigger_rect: { top: number; bottom: number },
  dropdown_height: number,
  dropdown: HTMLUListElement,
): string {
  if (expected_placement === `bottom`) return `${trigger_rect.bottom}px`
  const margin_px = getComputedStyle(dropdown).marginTop.replace(/px$/u, ``)
  const margin_top = Number(margin_px) || 0
  return `${Math.max(0, trigger_rect.top - dropdown_height - margin_top)}px`
}

test.each([
  {
    placement: `auto`,
    trigger_rect: { top: 100, bottom: 130 },
    dropdown_height: 200,
    viewport_height: 800,
    expected_placement: `bottom`,
    desc: `plenty of space below`,
  },
  {
    placement: `auto`,
    trigger_rect: { top: 600, bottom: 630 },
    dropdown_height: 200,
    viewport_height: 700,
    expected_placement: `top`,
    desc: `insufficient space below and more space above`,
  },
  {
    placement: `top`,
    trigger_rect: { top: 300, bottom: 330 },
    dropdown_height: 200,
    viewport_height: 800,
    expected_placement: `top`,
    desc: `forced above despite ample space below`,
  },
  {
    placement: `bottom`,
    trigger_rect: { top: 600, bottom: 630 },
    dropdown_height: 200,
    viewport_height: 700,
    expected_placement: `bottom`,
    desc: `forced below despite tight space below`,
  },
  {
    placement: `auto`,
    trigger_rect: { top: 600, bottom: 630 },
    dropdown_height: 0,
    viewport_height: 700,
    expected_placement: `bottom`,
    desc: `unmeasured dropdown (offsetHeight 0) falls back to bottom`,
  },
] as const)(
  `placement=$placement with $desc resolves to $expected_placement`,
  async ({
    placement,
    trigger_rect,
    dropdown_height,
    viewport_height,
    expected_placement,
  }) => {
    await mount_with_portal(placement)
    const dropdown = stub_layout({ trigger_rect, dropdown_height, viewport_height })

    globalThis.dispatchEvent(new Event(`resize`)) // force update_position with stubs

    expect(dropdown.dataset.placement).toBe(expected_placement)
    expect(dropdown.style.top).toBe(
      expected_top_style(expected_placement, trigger_rect, dropdown_height, dropdown),
    )
  },
)

test.each([
  // forced top with trigger near viewport top and dropdown taller than space above
  { placement: `top`, trigger_rect: { top: 50, bottom: 80 }, dropdown_height: 300 },
  // auto flips above (830 + 900 > 800 and 750 > 800 - 780) but 750 - 900 < 0
  { placement: `auto`, trigger_rect: { top: 750, bottom: 780 }, dropdown_height: 900 },
] as const)(
  `placement=$placement never positions dropdown above viewport top (clamps to 0)`,
  async ({ placement, trigger_rect, dropdown_height }) => {
    await mount_with_portal(placement)
    const dropdown = stub_layout({ trigger_rect, dropdown_height, viewport_height: 800 })

    globalThis.dispatchEvent(new Event(`resize`))

    expect(dropdown.dataset.placement).toBe(`top`)
    expect(dropdown.style.top).toBe(`0px`)
  },
)

test(`placement recomputes on scroll and reacts to updated portal params`, async () => {
  const props = $state<MultiSelectProps>({
    options: [1, 2, 3],
    open: true,
    portal: { active: true, placement: `auto` },
  })
  mount(MultiSelect, { target: document.body, props })
  await tick()

  const dropdown = stub_layout({
    trigger_rect: { top: 100, bottom: 130 },
    dropdown_height: 200,
    viewport_height: 800,
  })
  globalThis.dispatchEvent(new Event(`scroll`)) // scroll listener also repositions
  expect(dropdown.dataset.placement).toBe(`bottom`)
  expect(dropdown.style.top).toBe(`130px`)

  // trigger moves near viewport bottom → auto placement flips above on next scroll
  vi.spyOn(doc_query(`div.multiselect`), `getBoundingClientRect`).mockReturnValue({
    top: 600,
    bottom: 630,
    left: 10,
    right: 210,
    width: 200,
    height: 30,
    x: 10,
    y: 600,
    toJSON: () => ({}),
  })
  Object.defineProperty(globalThis, `innerHeight`, {
    value: 700,
    configurable: true,
    writable: true,
  })
  globalThis.dispatchEvent(new Event(`scroll`))
  expect(dropdown.dataset.placement).toBe(`top`)

  // changing placement via props flows through the action's update() method
  props.portal = { active: true, placement: `bottom` }
  await tick()
  globalThis.dispatchEvent(new Event(`resize`))
  expect(dropdown.dataset.placement).toBe(`bottom`)
  expect(dropdown.style.top).toBe(`630px`)
})
