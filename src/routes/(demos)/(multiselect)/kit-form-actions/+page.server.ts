import { fail } from '@sveltejs/kit'
import { colors as allowed_colors } from '$site/options'
import type { Actions } from './$types'

// Form actions require a server and cannot work on static sites.
// The underscore prefix disables this export during static build.
// To test locally with `npm run dev`, rename `_actions` to `actions`.
// eslint-disable-next-line no-underscore-dangle -- intentionally disabled for static builds
export const _actions = {
  'validate-form': async ({ request }) => {
    const data = await request.formData()
    let colors = data.get(`colors`)

    // failure branches return an empty array so the client can always bind the
    // result to MultiSelect's `selected` prop without type checks
    if (!colors || typeof colors !== `string`) {
      return fail(400, { colors: [], error: `missing` })
    }

    try {
      colors = JSON.parse(colors)
    } catch (error) {
      return fail(400, {
        colors: [],
        error: `json: ${String(error)}`,
      })
    }

    if (!Array.isArray(colors)) {
      return fail(400, { colors: [], error: `array` })
    }
    // only the offered colors may reach the response, so a hand-crafted POST can't
    // echo arbitrary strings or objects back into the page
    const valid_colors = colors.filter(
      (color: unknown): color is string =>
        typeof color === `string` && allowed_colors.includes(color),
    )
    if (valid_colors.length === 0) {
      return fail(400, { colors: [], error: `missing` })
    }
    if (valid_colors.length === 1 && valid_colors[0] === `Red`) {
      return fail(400, { colors: valid_colors, error: `boring` })
    }

    return { colors: valid_colors, success: true }
  },
} satisfies Actions
