import type { MultiSelectProps } from '$lib'
import { assert } from 'vite-plus/test'

export function doc_query<T extends Element>(selector: string): T {
  const node = document.querySelector<T>(selector)
  assert(node !== null, `No element found for selector: ${selector}`)
  return node
}

export type Test2WayBindProps = MultiSelectProps & {
  onActiveIndexChanged?: (data: MultiSelectProps[`activeIndex`]) => unknown
  onActiveOptionChanged?: (data: MultiSelectProps[`activeOption`]) => unknown
  onOptionsChanged?: (data: MultiSelectProps[`options`]) => unknown
  onSelectedChanged?: (data: MultiSelectProps[`selected`]) => unknown
  onValueChanged?: (data: MultiSelectProps[`value`]) => unknown
}
