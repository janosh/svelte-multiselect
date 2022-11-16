import { invalid } from '@sveltejs/kit'
import { readFileSync } from 'fs'
import type { Actions, PageServerLoad } from './$types'

// remove leading underscore to activate this example
// needs to be disabled for building static site
// TODO find a way to make this work on static docs site
export const _actions: Actions = {
  'validate-form': async ({ request }) => {
    const data = await request.formData()
    let colors = data.get(`colors`)

    try {
      colors = JSON.parse(colors)
    } catch (err) {
      return invalid(400, { colors, error: `json` })
    }

    if (!Array.isArray(colors)) {
      return invalid(400, { colors, error: `array` })
    }
    if (colors.length === 1 && colors[0] === `Red`) {
      return invalid(400, { colors, error: `boring` })
    }

    return { colors, success: true }
  },
}

export const load: PageServerLoad = () => {
  return {
    codes: [`.svelte`, `.server.ts`].map((ext) => {
      const filepath = new URL(`./+page${ext}`, import.meta.url)
      try {
        const code = readFileSync(filepath, `utf8`)
        return [`+page${ext}`, code]
      } catch (error) {
        // catch file not found error which occur during site build
        return [`+page${ext}`, `code`]
      }
    }),
  }
}
