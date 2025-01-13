import { CircleSpinner } from '$lib'
import { expect, test } from 'vitest'
import { queryWithFail } from './utils'
import { render } from '@testing-library/svelte'

test(`CircleSpinner prop size`, async () => {
  const size = `100px`

  render(CircleSpinner, { target: document.body, props: { size } })

  const div = queryWithFail(`div`)
  expect(div.style.width).toBe(size)
  expect(div.style.height).toBe(size)
})
