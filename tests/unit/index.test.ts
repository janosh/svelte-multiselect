import IndexMultiSelect from '$lib'
import MultiSelect from '$lib/MultiSelect.svelte'
import { expect, test } from 'vitest'

test(`default export from index.ts is same as component file`, () => {
  expect(IndexMultiSelect).toBe(MultiSelect)
})
