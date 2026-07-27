import type { MultiSelectProps } from '$lib'
import { assert } from 'vite-plus/test'

// Generic return type keeps call sites concise for DOM-specific assertions.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function doc_query<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector)
  assert(node !== null, `No element found for selector: ${selector}`)
  return node
}

// Shadows a prototype getter (navigator.userAgent, documentElement.clientWidth) with
// an own value property. Returns the undo, which callers must register for teardown so
// a failed assertion cannot leak the stub into later tests.
export const stub_prop = (target: object, prop: string, value: unknown) => {
  Object.defineProperty(target, prop, { value, configurable: true })
  return () => Reflect.deleteProperty(target, prop)
}

export type Test2WayBindProps = MultiSelectProps & {
  onActiveIndexChanged?: (data: MultiSelectProps[`activeIndex`]) => unknown
  onActiveOptionChanged?: (data: MultiSelectProps[`activeOption`]) => unknown
  onOptionsChanged?: (data: MultiSelectProps[`options`]) => unknown
  onSearchTextChanged?: (data: MultiSelectProps[`searchText`]) => unknown
  onSelectedChanged?: (data: MultiSelectProps[`selected`]) => unknown
  onValueChanged?: (data: MultiSelectProps[`value`]) => unknown
}
