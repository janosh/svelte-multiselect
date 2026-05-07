import type { MultiSelectProps } from '$lib'
import { assert } from 'vite-plus/test'

// Generic return type keeps call sites concise for DOM-specific assertions.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export function doc_query<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector)
  assert(node !== null, `No element found for selector: ${selector}`)
  return node
}

export type Test2WayBindProps = MultiSelectProps & {
  onActiveIndexChanged?: (data: MultiSelectProps[`activeIndex`]) => unknown
  onActiveOptionChanged?: (data: MultiSelectProps[`activeOption`]) => unknown
  onOptionsChanged?: (data: MultiSelectProps[`options`]) => unknown
  onSearchTextChanged?: (data: MultiSelectProps[`searchText`]) => unknown
  onSelectedChanged?: (data: MultiSelectProps[`selected`]) => unknown
  onValueChanged?: (data: MultiSelectProps[`value`]) => unknown
}
