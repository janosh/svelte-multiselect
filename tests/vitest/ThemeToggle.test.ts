import {
  apply_theme_mode,
  listen_theme_storage,
  system_preference,
  theme,
  ThemeToggle,
} from '$lib'
import { icon_data } from '$lib/icons'
import type { ComponentProps } from 'svelte'
import { mount, tick, unmount } from 'svelte'
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index.ts'

const mounted: Record<string, unknown>[] = []

beforeEach(() => {
  apply_theme_mode(`system`)
  localStorage.clear()
  sessionStorage.clear()
  document.documentElement.style.colorScheme = ``
  delete document.documentElement.dataset.theme
})

afterEach(async () => {
  for (const app of mounted.splice(0)) await unmount(app)
  vi.unstubAllGlobals()
})

const mount_theme_toggle = async (props: ComponentProps<typeof ThemeToggle> = {}) => {
  mounted.push(mount(ThemeToggle, { target: document.body, props }))
  await tick()
  return doc_query<HTMLButtonElement>(`button`)
}

const applied_theme = () => [
  document.documentElement.style.colorScheme,
  document.documentElement.dataset.theme,
]

const rendered_icon_path = () => doc_query(`button svg path`).getAttribute(`d`)

const disable_storage = () => {
  const throw_disabled = () => {
    throw new DOMException(`storage disabled`)
  }
  vi.stubGlobal(`localStorage`, { getItem: throw_disabled, setItem: throw_disabled })
  return vi.spyOn(console, `error`).mockImplementation(() => {})
}

test(`initial render stays hidden until hydration`, async () => {
  localStorage.setItem(`theme`, `dark`)
  mounted.push(mount(ThemeToggle, { target: document.body }))
  const button = doc_query<HTMLButtonElement>(`button`)
  expect(button.style.visibility).toBe(`hidden`)
  expect(button.querySelector(`svg`)).toBeNull()
  // applying it pre-hydration would flash a theme the icon disagrees with
  expect(applied_theme()).toEqual([``, undefined])

  await tick()
  expect(button.style.visibility).toBe(`visible`)
  expect(applied_theme()).toEqual([`dark`, `dark`])
})

// icon_props.style is appended after the default transform rather than replacing it, so
// a caller-supplied size lands on the element but still gets scaled: 2em renders at 3em
test(`icon_props.style is appended after the default transform`, async () => {
  await mount_theme_toggle({ icon_props: { style: `width: 2em; height: 2em` } })
  const icon = doc_query<SVGSVGElement>(`button svg`)
  expect([icon.style.width, icon.style.height]).toEqual([`2em`, `2em`])
  expect(icon.style.transform).toBe(`scale(1.5)`)
})

test.each([
  [`theme`, `light`, `light`, `Sun`],
  [`theme`, `dark`, `dark`, `Moon`],
  [`theme`, `system`, `light`, `Monitor`],
  [`theme`, `blue`, `light`, `Monitor`],
  [`theme_mode`, `dark`, `dark`, `Moon`],
] as const)(`mount applies %s=%s`, async (storage_key, stored, effective, icon_name) => {
  localStorage.setItem(storage_key, stored)
  await mount_theme_toggle()
  expect(applied_theme()).toEqual([effective, effective])
  expect(rendered_icon_path()).toBe(icon_data[icon_name].d)
})

// the rows above cover each key alone, so nothing pins which one wins when both exist
test(`theme key takes precedence over the legacy theme_mode key`, async () => {
  localStorage.setItem(`theme_mode`, `dark`)
  localStorage.setItem(`theme`, `light`)
  await mount_theme_toggle()
  expect(applied_theme()).toEqual([`light`, `light`])
  expect(localStorage.getItem(`theme_mode`)).toBeNull() // retired on apply
})

test(`gracefully degrades when localStorage throws`, async () => {
  const console_error = disable_storage()

  const button = await mount_theme_toggle()
  expect(button.style.visibility).toBe(`visible`)
  expect(applied_theme()).toEqual([`light`, `light`])

  button.click()
  await tick()
  expect(applied_theme()).toEqual([`dark`, `dark`])

  expect(console_error).toHaveBeenCalledWith(
    expect.stringContaining(`Failed to get theme mode from localStorage`),
    expect.anything(),
  )
  expect(console_error).toHaveBeenCalledWith(
    expect.stringContaining(`Failed to set theme mode`),
    expect.anything(),
  )
})

test(`mount preserves an externally applied theme when storage is unavailable`, async () => {
  disable_storage()

  apply_theme_mode(`dark`)
  expect(theme.mode).toBe(`dark`)
  await mount_theme_toggle()

  expect(applied_theme()).toEqual([`dark`, `dark`])
  expect(rendered_icon_path()).toBe(icon_data.Moon.d)
})

test(`click cycles through light -> system -> dark -> light`, async () => {
  const observed_modes: (string | null)[] = []
  const onclick = vi.fn(() => observed_modes.push(localStorage.getItem(`theme`)))
  localStorage.setItem(`theme`, `light`)
  const button = await mount_theme_toggle({ onclick })
  expect(applied_theme()).toEqual([`light`, `light`])

  for (const effective of [`light`, `dark`, `light`] as const) {
    button.click()
    await tick()
    expect(applied_theme()).toEqual([effective, effective])
  }

  expect(observed_modes).toEqual([`system`, `dark`, `light`])
})

test(`system mode reapplies theme when media query changes`, async () => {
  let matches = false
  let change_handler: (() => void) | undefined
  const match_media = vi.fn((media: string) => ({
    media,
    get matches() {
      return matches
    },
    addEventListener: (_event: string, handler: () => void) => (change_handler = handler),
    removeEventListener: () => {},
  }))
  vi.stubGlobal(`matchMedia`, match_media)
  localStorage.setItem(`theme`, `system`)
  await mount_theme_toggle()
  expect(applied_theme()).toEqual([`light`, `light`])
  expect(match_media).toHaveBeenCalledWith(`(prefers-color-scheme: dark)`)

  matches = true
  change_handler?.()
  await tick()

  expect(applied_theme()).toEqual([`dark`, `dark`])
})

test(`storage events synchronize current and legacy theme keys until unmount`, async () => {
  const dispatch_storage = async (key: string | null, storage_area = localStorage) => {
    globalThis.dispatchEvent(
      new StorageEvent(`storage`, { key, storageArea: storage_area }),
    )
    await tick()
  }
  localStorage.setItem(`theme`, `light`)
  await mount_theme_toggle()

  localStorage.setItem(`theme`, `dark`)
  await dispatch_storage(`theme`)
  expect(applied_theme()).toEqual([`dark`, `dark`])
  expect(rendered_icon_path()).toBe(icon_data.Moon.d)

  localStorage.setItem(`theme`, `light`)
  await dispatch_storage(`unrelated`)
  expect(applied_theme()).toEqual([`dark`, `dark`])

  sessionStorage.setItem(`theme`, `dark`)
  await dispatch_storage(`theme`, sessionStorage)
  expect(applied_theme()).toEqual([`dark`, `dark`])

  localStorage.removeItem(`theme`)
  localStorage.setItem(`theme_mode`, `light`)
  await dispatch_storage(`theme_mode`)
  expect(applied_theme()).toEqual([`light`, `light`])
  expect(localStorage.getItem(`theme_mode`)).toBeNull()

  localStorage.clear()
  await dispatch_storage(null)
  expect(localStorage.getItem(`theme`)).toBe(`system`)
  expect(rendered_icon_path()).toBe(icon_data.Monitor.d)

  const app = mounted.pop()
  if (!app) throw new Error(`ThemeToggle test app was not mounted`)
  await unmount(app)
  localStorage.setItem(`theme`, `dark`)
  await dispatch_storage(`theme`)
  expect(applied_theme()).toEqual([`light`, `light`])
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

// CommandMenu / PageSearch call apply_theme_mode without clicking the toggles
test(`apply_theme_mode keeps mounted ThemeToggles in sync`, async () => {
  localStorage.setItem(`theme`, `light`)
  await mount_theme_toggle()
  await mount_theme_toggle()
  const buttons = document.querySelectorAll(`button`)
  expect(buttons).toHaveLength(2)

  apply_theme_mode(`dark`)
  await tick()
  expect(applied_theme()).toEqual([`dark`, `dark`])
  expect(localStorage.getItem(`theme`)).toBe(`dark`)
  for (const button of buttons) {
    expect(button.getAttribute(`aria-label`)).toBe(`Switch to light theme`)
    expect(button.querySelector(`path`)?.getAttribute(`d`)).toBe(icon_data.Moon.d)
  }
})

test(`system_preference defaults to light without matchMedia`, () => {
  vi.stubGlobal(`matchMedia`, undefined)
  expect(system_preference()).toBe(`light`)
})

test.each([`document`, `addEventListener`] as const)(
  `listen_theme_storage fails clearly without browser global %s`,
  (global_name) => {
    vi.stubGlobal(global_name, undefined)
    expect(() => listen_theme_storage()).toThrow(`listen_theme_storage() is client-only`)
  },
)
