import { ThemeToggle } from '$lib'
import { mount, tick } from 'svelte'
import { beforeEach, expect, test, vi } from 'vitest'
import { doc_query } from './index.ts'

const mount_theme_toggle = async () => {
  mount(ThemeToggle, { target: document.body })
  await tick()
  const button = doc_query<HTMLButtonElement>(`button`)
  return { button }
}

const expect_applied_theme = (theme_mode: `light` | `dark`) => {
  expect(document.documentElement.style.colorScheme).toBe(theme_mode)
  expect(document.documentElement.dataset.theme).toBe(theme_mode)
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.style.colorScheme = ``
  delete document.documentElement.dataset.theme
})

test(`initial render stays hidden until hydration`, () => {
  localStorage.setItem(`theme`, `light`)
  mount(ThemeToggle, { target: document.body })
  const button = doc_query<HTMLButtonElement>(`button`)
  expect(button.style.visibility).toBe(`hidden`)
  expect(button.querySelector(`svg`)).toBeNull()
})

test.each(
  [
    { storage_key: `theme`, stored_theme_mode: `light` },
    { storage_key: `theme`, stored_theme_mode: `dark` },
    { storage_key: `theme_mode`, stored_theme_mode: `light` },
    { storage_key: `theme_mode`, stored_theme_mode: `dark` },
  ] as const,
)(
  `mount applies $storage_key=$stored_theme_mode`,
  async ({ storage_key, stored_theme_mode }) => {
    const next_mode = stored_theme_mode === `light` ? `dark` : `light`
    const expected_title = `Switch to ${next_mode} theme`
    localStorage.setItem(storage_key, stored_theme_mode)
    const { button } = await mount_theme_toggle()
    expect_applied_theme(stored_theme_mode)
    expect(button.title).toBe(expected_title)
  },
)

test(`gracefully degrades when localStorage throws`, async () => {
  const get_spy = vi.spyOn(localStorage, `getItem`).mockImplementation(() => {
    throw new DOMException(`storage disabled`)
  })
  const set_spy = vi.spyOn(localStorage, `setItem`).mockImplementation(() => {
    throw new DOMException(`storage disabled`)
  })

  const { button } = await mount_theme_toggle()
  expect(button.style.visibility).toBe(`visible`)
  expect(document.documentElement.dataset.theme).toMatch(/^(light|dark)$/)

  button.click()
  await tick()
  expect(document.documentElement.dataset.theme).toMatch(/^(light|dark)$/)

  get_spy.mockRestore()
  set_spy.mockRestore()
})

test(`click toggles theme and persists only theme key`, async () => {
  localStorage.setItem(`theme`, `dark`)
  const { button } = await mount_theme_toggle()

  button.click()
  await tick()

  expect_applied_theme(`light`)
  expect(localStorage.getItem(`theme`)).toBe(`light`)
  expect(localStorage.getItem(`theme_mode`)).toBeNull()
  expect(button.title).toBe(`Switch to dark theme`)
})
