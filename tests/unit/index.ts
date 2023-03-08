import { beforeEach } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ``
})

export function doc_query<T extends HTMLElement>(selector: string): T {
  const node = document.querySelector(selector)
  if (!node) throw new Error(`No element found for selector: ${selector}`)
  return node as T
}
