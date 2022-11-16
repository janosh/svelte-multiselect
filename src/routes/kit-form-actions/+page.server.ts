import { invalid } from '@sveltejs/kit'
import { readFileSync } from 'fs'
import type { Actions, PageServerLoad } from './$types'

export const actions: Actions = {
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

export const prerender = false

export const load: PageServerLoad = () => {
  return {
    codes: [`.svelte`, `.server.ts`].map((ext) => {
      const filepath = new URL(`./+page${ext}`, import.meta.url)
      const code = readFileSync(filepath, `utf8`)

      return [`+page${ext}`, code]
    }),
  }
}
