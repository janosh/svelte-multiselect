import { fail } from '@sveltejs/kit'
import type { Actions } from './$types'

// Form actions require a server and cannot work on static sites.
// The underscore prefix disables this export during static build.
// To test locally with `pnpm dev`, rename `_actions` to `actions`.
export const _actions = {
  'validate-form': async ({ request }) => {
    const data = await request.formData()
    let colors = data.get(`colors`)

    if (!colors || typeof colors !== `string`) {
      return fail(400, { colors, error: `missing` })
    }

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
