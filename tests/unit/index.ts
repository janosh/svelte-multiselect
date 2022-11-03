import { beforeEach } from 'vitest'

beforeEach(() => {
  document.body.innerHTML = ``
})

export async function sleep(ms: number = 1) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function doc_query(selector: string) {
  const node = document.querySelector(selector)
  if (!node) throw new Error(`No element found for selector: ${selector}`)
  return node as HTMLElement
}
