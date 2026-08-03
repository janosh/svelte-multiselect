// localStorage that never throws: a disabled store, a private-mode window or a full
// quota degrades every call to a no-op, so persistence stays best-effort and the UI
// state it backs still works in memory. Plus the two patterns that keep reappearing on
// top of it: a persisted enum choice and a most-recently-used list.

import { SvelteSet } from 'svelte/reactivity'
import { is_object } from './utils'

export const storage_get = (key: string): string | null => {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export const storage_set = (key: string, value: string): void => {
  try {
    globalThis.localStorage?.setItem(key, value)
  } catch {
    // Ignore storage quota/private-mode failures. State still works in memory.
  }
}

export const storage_remove = (key: string): void => {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

// Parsed storage is untrusted, so the fallback's type must not pretend to validate it.
// Callers narrow the result before putting it into typed state.
export const storage_get_json = (key: string, fallback: unknown): unknown => {
  const stored = storage_get(key)
  if (stored === null) return fallback
  try {
    return JSON.parse(stored)
  } catch {
    return fallback
  }
}

export const storage_set_json = (key: string, value: object): void => {
  try {
    const serialized = JSON.stringify(value)
    if (serialized !== undefined) storage_set(key, serialized)
  } catch {
    // Cyclic values, BigInts and throwing toJSON methods are not persistable.
  }
}

// Persisted box size for a resizable panel. Invalid or missing sizes come back null so
// the caller falls through to its own default.
export const storage_get_size = (key: string): { w: number; h: number } | null => {
  const size: unknown = storage_get_json(key, null)
  if (!is_object(size)) return null
  const { w, h } = size
  return typeof w === `number` &&
    typeof h === `number` &&
    Number.isFinite(w) &&
    Number.isFinite(h)
    ? { w, h }
    : null
}

// Persisted enum preference: the stored value while it is still one of `options`, else
// `fallback`. Pair with `storage_set(key, value)` on change so UI toggles (chart type,
// time window, metric mode) survive a reload.
export const persisted_choice = <T extends string>(
  key: string,
  options: readonly T[],
  fallback: T,
): T => {
  const stored = storage_get(key)
  return options.find((option) => option === stored) ?? fallback
}

export type RecentListConfig<T> = {
  storage_key: string
  max_items: number // non-negative integer
  key_of: (item: T) => string
  // Entries failing this are dropped on load, so a stale or hand-edited payload
  // cannot put junk in front of the user
  is_valid: (value: unknown) => value is T
}

// Most-recently-used list persisted to localStorage, deduped by `key_of`. Every method
// takes and returns the list rather than holding it, so the caller keeps owning the
// state (a `$state` array, a store, a plain field) and each write is one assignment.
export const create_recent_list = <T>(config: RecentListConfig<T>) => {
  const { storage_key, max_items, key_of, is_valid } = config
  if (!Number.isInteger(max_items) || max_items < 0) {
    throw new RangeError(`max_items must be a non-negative integer, got ${max_items}`)
  }
  const persist = (items: T[]): T[] => {
    storage_set_json(storage_key, items)
    return items
  }
  const without = (items: T[], key: string): T[] =>
    items.filter((candidate) => key_of(candidate) !== key)
  return {
    load: (): T[] => {
      const parsed: unknown = storage_get_json(storage_key, [])
      if (!Array.isArray(parsed)) return []
      const seen_keys = new SvelteSet<string>()
      return parsed
        .filter(is_valid)
        .filter((item) => {
          const key = key_of(item)
          if (seen_keys.has(key)) return false
          seen_keys.add(key)
          return true
        })
        .slice(0, max_items)
    },
    remember: (item: T, items: T[]): T[] =>
      persist([item, ...without(items, key_of(item))].slice(0, max_items)),
    forget: (key: string, items: T[]): T[] => persist(without(items, key)),
    // Re-insert a just-forgotten item at its original position (undo support)
    restore: (item: T, index: number, items: T[]): T[] => {
      const rest = without(items, key_of(item))
      const clamped = Number.isFinite(index)
        ? Math.min(Math.max(Math.floor(index), 0), rest.length)
        : 0
      return persist(
        [...rest.slice(0, clamped), item, ...rest.slice(clamped)].slice(0, max_items),
      )
    },
  }
}
