import { expect, test } from 'vitest'
import IndexMultiSelect from '../src/lib'
import MultiSelect from '../src/lib/MultiSelect.svelte'

test(`default export from index.ts is same as component file`, () => {
  expect(IndexMultiSelect).toBe(MultiSelect)
})
