import { invalid } from '@sveltejs/kit'
import type { Actions } from './$types'

// remove leading underscore to activate this example
// needs to be disabled for building static site
// TODO is there a way to make this work on static site?
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
