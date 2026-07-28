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
  // arrays still replace wholesale — `ignorePatterns: [...]` means exactly that
  expect(
    make_config({ lint: { ignorePatterns: [`static/**`] } }).lint.ignorePatterns,
  ).toEqual([`static/**`])
})

// Lint's object members merge a second level down, unlike every other section. `rules` is
// where it really bites — naming one rule used to hand back a config holding only that
// rule, dropping 150-odd others — but `options` and `categories` share the mechanism, and
// a wholesale overwrite of either passes every other test in this file.
test.each([
  [`rules`, { 'no-var': `off` }],
  [`options`, { typeCheck: false }],
  [`categories`, { perf: `warn` }],
] as const)(`overriding one lint %s entry keeps the rest`, (member, override) => {
  const defaults = make_config()
  const merged = make_config({ lint: { [member]: override } })

  expect(merged.lint[member]).toEqual({ ...defaults.lint[member], ...override })
})

// The defaults are module-level objects, so a result sharing their nested maps would let
// one project mutate the config every later call hands out.
test(`a returned config owns its nested state`, () => {
  // a deep snapshot: a plain make_config() would alias the very objects mutated below
  // when they are shared, making the comparison vacuous
  const before = structuredClone(make_config())
  const mine = make_config()
  mine.lint.rules[`no-var`] = `off` // a nested map
  mine.lint.ignorePatterns.push(`LEAKED`) // a nested array
  mine.staged[`*`] = `LEAKED` // a sibling section

  expect(make_config()).toEqual(before)
})
