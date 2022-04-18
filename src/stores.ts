import { writable } from 'svelte/store'
import { Option } from './lib'

function session_store<T>(name: string, initialValue: T) {
  if (typeof sessionStorage !== `undefined` && sessionStorage[name]) {
    try {
      initialValue = JSON.parse(sessionStorage[name])
    } catch (err) {
      console.error(
        `Error parsing sessionStorage[${name}]: ${err}, resetting to initial value ${initialValue}`
      )
      sessionStorage[name] = JSON.stringify(initialValue)
    }
  }

  const { subscribe, set } = writable(initialValue)

  return {
    subscribe,
    set: (val: T) => {
      if (val !== undefined && typeof sessionStorage !== `undefined`) {
        sessionStorage[name] = JSON.stringify(val)
      }
      set(val)
    },
  }
}

export const language_store = session_store<Option[]>(
  `language-store`,
  `Python TypeScript C`.split(` `)
)
