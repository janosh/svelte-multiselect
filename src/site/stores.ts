import { session_store } from 'svelte-zoo'
import { writable } from 'svelte/store'

export const language_store = session_store<string[]>(
  `language-store`,
  `Python TypeScript C Haskell`.split(` `)
)

export const demos = writable<string[]>([])
