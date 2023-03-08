import { CircleSpinner } from '$lib'
import { expect, test } from 'vitest'
import { doc_query } from '.'

test(`CircleSpinner prop size`, async () => {
  const size = `100px`
  new CircleSpinner({ target: document.body, props: { size } })

  const div = doc_query(`div`)
  expect(div.style.width).toBe(size)
  expect(div.style.height).toBe(size)
})
