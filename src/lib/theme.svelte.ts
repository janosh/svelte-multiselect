// Headless theme helpers shared by ThemeToggle and callers that set theme without the
// button (CommandMenu / PageSearch actions).

import { persisted_choice, storage_set } from './storage'

const THEME_MODES = [`light`, `dark`, `system`] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const THEME_MODE_CYCLE = {
  light: `system`,
  system: `dark`,
  dark: `light`,
} as const

export const system_preference = (): `light` | `dark` =>
  typeof matchMedia !== `undefined` && matchMedia(`(prefers-color-scheme: dark)`).matches
    ? `dark`
    : `light`

export const resolve_theme_mode = (): ThemeMode =>
  persisted_choice(`theme`, THEME_MODES, `system`)

// Shared so ThemeToggle's icon stays in sync when apply_theme_mode is called elsewhere
let theme_mode = $state<ThemeMode>(`system`)
export const theme = {
  get mode(): ThemeMode {
    return theme_mode
  },
}

export const apply_theme_mode = (mode: ThemeMode): void => {
  if (typeof document === `undefined`)
    throw new TypeError(`apply_theme_mode(${mode}) is client-only`)
  const effective = mode === `system` ? system_preference() : mode
  document.documentElement.style.colorScheme = effective
  document.documentElement.dataset.theme = effective
  theme_mode = mode
  storage_set(`theme`, mode)
}

export const listen_theme_storage = (): (() => void) => {
  if (
    typeof document === `undefined` ||
    typeof globalThis.addEventListener !== `function`
  )
    throw new TypeError(`listen_theme_storage() is client-only`)
  const on_storage = ({ key, storageArea: storage_area }: StorageEvent) => {
    if (storage_area === localStorage && (key === null || key === `theme`))
      apply_theme_mode(resolve_theme_mode())
  }
  globalThis.addEventListener(`storage`, on_storage)
  return () => globalThis.removeEventListener(`storage`, on_storage)
}
