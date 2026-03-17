import { ThemeToggle } from '$lib'
import { mount, tick } from 'svelte'
import { beforeEach, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index.ts'

// happy-dom's localStorage may lack standard methods — provide a minimal shim
const storage = new Map<string, string>()
Object.defineProperty(globalThis, `localStorage`, {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, val: string) => storage.set(key, val),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
  writable: true,
})

beforeEach(() => {
  vi.restoreAllMocks()
  storage.clear()
  document.documentElement.style.colorScheme = ``
  delete document.documentElement.dataset.theme
})

const mount_theme_toggle = async () => {
  mount(ThemeToggle, { target: document.body })
  await tick()
  return doc_query<HTMLButtonElement>(`button`)
}

const expect_applied_theme = (effective: `light` | `dark`) => {
  expect(document.documentElement.style.colorScheme).toBe(effective)
  expect(document.documentElement.dataset.theme).toBe(effective)
}

test(`initial render stays hidden until hydration`, () => {
  localStorage.setItem(`theme`, `light`)
  mount(ThemeToggle, { target: document.body })
  const button = doc_query<HTMLButtonElement>(`button`)
  expect(button.style.visibility).toBe(`hidden`)
  expect(button.querySelector(`svg`)).toBeNull()
})

test.each([
  { storage_key: `theme`, stored: `light`, effective: `light` },
  { storage_key: `theme`, stored: `dark`, effective: `dark` },
  { storage_key: `theme`, stored: `system`, effective: `light` },
  { storage_key: `theme_mode`, stored: `light`, effective: `light` },
  { storage_key: `theme_mode`, stored: `dark`, effective: `dark` },
] as const)(
  `mount applies $storage_key=$stored`,
  async ({ storage_key, stored, effective }) => {
    localStorage.setItem(storage_key, stored)
    await mount_theme_toggle()
    expect_applied_theme(effective)
  },
)

test(`gracefully degrades when localStorage throws`, async () => {
  vi.spyOn(localStorage, `getItem`).mockImplementation(() => {
    throw new DOMException(`storage disabled`)
  })
  vi.spyOn(localStorage, `setItem`).mockImplementation(() => {
    throw new DOMException(`storage disabled`)
  })

  const button = await mount_theme_toggle()
  expect(button.style.visibility).toBe(`visible`)
  expect_applied_theme(`light`)

  button.click()
  await tick()
  expect_applied_theme(`dark`)
})

test(`click cycles through light -> system -> dark -> light`, async () => {
  localStorage.setItem(`theme`, `light`)
  const button = await mount_theme_toggle()
  expect_applied_theme(`light`)

  // light -> system (resolves to light via mock with matches: false)
  button.click()
  await tick()
  expect(localStorage.getItem(`theme`)).toBe(`system`)
  expect_applied_theme(`light`)

  // system -> dark
  button.click()
  await tick()
  expect(localStorage.getItem(`theme`)).toBe(`dark`)
  expect_applied_theme(`dark`)

  // dark -> light
  button.click()
  await tick()
  expect(localStorage.getItem(`theme`)).toBe(`light`)
  expect_applied_theme(`light`)
})
