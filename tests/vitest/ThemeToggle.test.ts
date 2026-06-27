import { ThemeToggle } from '$lib'
import { mount, tick } from 'svelte'
import { beforeEach, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index.ts'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.style.colorScheme = ``
  delete document.documentElement.dataset.theme
})

const mount_theme_toggle = async () => {
  mount(ThemeToggle, { target: document.body })
  await tick()
  return doc_query<HTMLButtonElement>(`button`)
}

const applied_theme = () => [
  document.documentElement.style.colorScheme,
  document.documentElement.dataset.theme,
]

test(`initial render stays hidden until hydration`, () => {
  localStorage.setItem(`theme`, `light`)
  mount(ThemeToggle, { target: document.body })
  const button = doc_query<HTMLButtonElement>(`button`)
  expect(button.style.visibility).toBe(`hidden`)
  expect(button.querySelector(`svg`)).toBeNull()
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

test(`gracefully degrades when localStorage throws`, async () => {
  for (const method of [`getItem`, `setItem`] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException(`storage disabled`)
    })
  }

  const button = await mount_theme_toggle()
  expect(button.style.visibility).toBe(`visible`)
  expect(applied_theme()).toEqual([`light`, `light`])

  button.click()
  await tick()
  expect(applied_theme()).toEqual([`dark`, `dark`])
})

test(`click cycles through light -> system -> dark -> light`, async () => {
  localStorage.setItem(`theme`, `light`)
  const button = await mount_theme_toggle()
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
})

test(`system mode reapplies theme when media query changes`, async () => {
  let matches = false
  let change_handler: (() => void) | undefined
  Object.defineProperty(globalThis, `matchMedia`, {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      media: query,
      get matches() {
        return matches
      },
      addEventListener: vi.fn((_event_name: string, handler: () => void) => {
        change_handler = handler
      }),
      removeEventListener: vi.fn(),
    })),
  })
  localStorage.setItem(`theme`, `system`)
  await mount_theme_toggle()
  expect(applied_theme()).toEqual([`light`, `light`])

  matches = true
  change_handler?.()
  await tick()

  expect(applied_theme()).toEqual([`dark`, `dark`])
})

test(`tooltip=false disables tooltip attachment`, async () => {
  mount(ThemeToggle, { target: document.body, props: { tooltip: false } })
  await tick()
  const button = doc_query<HTMLButtonElement>(`button`)

  expect(button.getAttribute(`data-original-title`)).toBeNull()
  expect(button.title).toContain(`Switch to`)
})
