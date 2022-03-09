import { readFileSync } from 'fs'
import { expect, test } from 'vitest'
import MultiSelect from '../src/lib'

const readme = readFileSync(`readme.md`, `utf8`)

const instance = new MultiSelect({
  target: document.body,
  props: { options: [] },
})

test(`readme documents all props`, () => {
  for (const prop of Object.keys(instance.$$.props)) {
    expect(readme).to.contain(prop)
  }
})
