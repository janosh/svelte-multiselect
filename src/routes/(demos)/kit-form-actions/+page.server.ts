import { fail } from '@sveltejs/kit'
import type { Actions } from './$types'

// remove leading underscore to activate this example
// needs to be disabled for building static site
// TODO is there a way to make this work on static site?
export const _actions = {
  'validate-form': async ({ request }) => {
    const data = await request.formData()
    let colors = data.get(`colors`)

    if (!colors || typeof colors !== `string`)
      return fail(400, { colors, error: `missing` })

    try {
      colors = JSON.parse(colors)
    } catch (err) {
      return fail(400, { colors, error: `json: ${err}` })
    }

    if (!Array.isArray(colors)) {
      return fail(400, { colors, error: `array` })
    }
    if (colors.length === 1 && colors[0] === `Red`) {
      return fail(400, { colors, error: `boring` })
    }

    return { colors, success: true }
  },
} satisfies Actions
