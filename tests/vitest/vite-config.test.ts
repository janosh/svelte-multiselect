import { make_config } from '$lib/vite-config'
import { expect, test } from 'vite-plus/test'

// Sections merge one level deep, so overriding a single glob or option leaves the rest
// of that section — and every other section — on the shared defaults.
test(`overrides merge into their section without dropping the rest`, () => {
  const defaults = make_config()
  const merged = make_config({ staged: { '*': `codespell` }, fmt: { printWidth: 95 } })

  expect(merged.staged).toEqual({ ...defaults.staged, '*': `codespell` })
  expect(merged.fmt).toEqual({ ...defaults.fmt, printWidth: 95 })
  expect(merged.lint).toEqual(defaults.lint) // untouched section
})

// The defaults are module-level objects shared by every call, so a leaked reference
// would let one project's override rewrite the next caller's config.
test(`overriding does not mutate the defaults behind later calls`, () => {
  const before = make_config()
  make_config({ staged: { '*': `codespell` }, lint: { ignorePatterns: [`static/**`] } })

  expect(make_config()).toEqual(before)
})
