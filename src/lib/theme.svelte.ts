// Headless theme helpers shared by ThemeToggle and callers that set theme without the
// button (CommandMenu / PageSearch actions).

export type ThemeMode = `light` | `dark` | `system`

export const THEME_MODE_CYCLE = {
  light: `system`,
  system: `dark`,
  dark: `light`,
} as const

export const system_preference = (): `light` | `dark` =>
  typeof matchMedia !== `undefined` && matchMedia(`(prefers-color-scheme: dark)`).matches
    ? `dark`
    : `light`

export const resolve_theme_mode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(`theme`)
    if (saved === `light` || saved === `dark` || saved === `system`) return saved
  } catch (error) {
    console.error(`Failed to get theme mode from localStorage`, error)
  }
  return `system`
}

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
  try {
    localStorage.setItem(`theme`, mode)
  } catch (error) {
    console.error(`Failed to set theme mode ${mode} in localStorage`, error)
  }
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
