import { assert } from "vitest"

export function doc_query<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector)
  assert(node != null, `No element found for selector: ${selector}`)
  return node
}