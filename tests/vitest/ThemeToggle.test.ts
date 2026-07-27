import { ThemeToggle } from '$lib'
import type { ComponentProps } from 'svelte'
import { mount, tick } from 'svelte'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index.ts'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.style.colorScheme = ``
  delete document.documentElement.dataset.theme
})

// the localStorage-failure test swaps the global out; leaking it breaks every later test
afterEach(() => vi.unstubAllGlobals())

const mount_theme_toggle = async (props: ComponentProps<typeof ThemeToggle> = {}) => {
  mount(ThemeToggle, { target: document.body, props })
  await tick()
  return doc_query<HTMLButtonElement>(`button`)
}

const applied_theme = () => [
  document.documentElement.style.colorScheme,
  document.documentElement.dataset.theme,
]

test(`initial render stays hidden until hydration`, async () => {
  localStorage.setItem(`theme`, `dark`)
  mount(ThemeToggle, { target: document.body })
  const button = doc_query<HTMLButtonElement>(`button`)
  expect(button.style.visibility).toBe(`hidden`)
  expect(button.querySelector(`svg`)).toBeNull()
  // applying it pre-hydration would flash a theme the icon disagrees with
  expect(applied_theme()).toEqual([``, undefined])

  await tick()
  expect(button.style.visibility).toBe(`visible`)
  expect(applied_theme()).toEqual([`dark`, `dark`])
  // sized here rather than in CSS, where Icon's own scoped rule wins
  const icon = doc_query<SVGSVGElement>(`button svg`)
  expect([icon.style.width, icon.style.height]).toEqual([`1.2em`, `1.2em`])
})

test(`icon_props override the default icon size`, async () => {
  await mount_theme_toggle({ icon_props: { style: `width: 2em; height: 2em` } })
  const icon = doc_query<SVGSVGElement>(`button svg`)
  expect([icon.style.width, icon.style.height]).toEqual([`2em`, `2em`])
})

test.each([
  [`theme`, `light`, `light`],
  [`theme`, `dark`, `dark`],
  [`theme`, `system`, `light`],
  [`theme_mode`, `light`, `light`],
  [`theme_mode`, `dark`, `dark`],
] as const)(`mount applies %s=%s`, async (storage_key, stored, effective) => {
  localStorage.setItem(storage_key, stored)
  await mount_theme_toggle()
  expect(applied_theme()).toEqual([effective, effective])
})

// the rows above cover each key alone, so nothing pins which one wins when both exist
test(`theme key takes precedence over the legacy theme_mode key`, async () => {
  localStorage.setItem(`theme_mode`, `dark`)
  localStorage.setItem(`theme`, `light`)
  await mount_theme_toggle()
  expect(applied_theme()).toEqual([`light`, `light`])
})

test(`gracefully degrades when localStorage throws`, async () => {
  const throw_disabled = () => {
    throw new DOMException(`storage disabled`)
  }
  // replace the global, don't spy on Storage.prototype: happy-dom's localStorage proxy
  // caches its bound methods, so a prototype spy never runs and injects no fault
  vi.stubGlobal(`localStorage`, {
    getItem: throw_disabled,
    setItem: throw_disabled,
  })
  const console_error = vi.spyOn(console, `error`).mockImplementation(() => {})

  const button = await mount_theme_toggle()
  expect(button.style.visibility).toBe(`visible`)
  expect(applied_theme()).toEqual([`light`, `light`])

  button.click()
  await tick()
  expect(applied_theme()).toEqual([`dark`, `dark`])

  // also the only proof the fault landed: working empty storage yields the same
  // light -> dark sequence asserted above
  expect(console_error.mock.calls.flat()).toEqual([
    `Failed to get theme mode from localStorage`,
    `Failed to set theme mode in localStorage`,
    `Failed to set theme mode in localStorage`,
  ])
})

test(`click cycles through light -> system -> dark -> light`, async () => {
  const observed_modes: (string | null)[] = []
  const onclick = vi.fn(() => observed_modes.push(localStorage.getItem(`theme`)))
  localStorage.setItem(`theme`, `light`)
  const button = await mount_theme_toggle({ onclick })
  expect(applied_theme()).toEqual([`light`, `light`])

  for (const [stored, effective] of [
    [`system`, `light`],
    [`dark`, `dark`],
    [`light`, `light`],
  ] as const) {
    button.click()
    await tick()
    expect(localStorage.getItem(`theme`)).toBe(stored)
    expect(applied_theme()).toEqual([effective, effective])
  }

  expect(onclick).toHaveBeenCalledTimes(3)
  expect(observed_modes).toEqual([`system`, `dark`, `light`])
})

test(`system mode reapplies theme when media query changes`, async () => {
  let matches = false
  let change_handler: (() => void) | undefined
  // stubGlobal so afterEach restores it - a leaked dark-preferring matchMedia would
  // silently change the theme every later test resolves from `system`
  vi.stubGlobal(`matchMedia`, (media: string) => ({
    media,
    get matches() {
      return matches
    },
    addEventListener: (_event: string, handler: () => void) => (change_handler = handler),
    removeEventListener: () => {},
  }))
  localStorage.setItem(`theme`, `system`)
  await mount_theme_toggle()
  expect(applied_theme()).toEqual([`light`, `light`])

  matches = true
  change_handler?.()
  await tick()

  expect(applied_theme()).toEqual([`dark`, `dark`])
})

// both rows needed: tooltip=false alone passes even if the attachment never runs
test.each([
  [`default`, {}, `Switch to dark theme`, null],
  [`false`, false, null, `Switch to dark theme`],
] as const)(
  `tooltip=%s decides whether the tooltip takes over the native title`,
  async (_label, tooltip, data_original_title, title) => {
    const button = await mount_theme_toggle({ tooltip })
    expect([
      button.getAttribute(`data-original-title`),
      button.getAttribute(`title`),
    ]).toEqual([data_original_title, title])
  },
)
