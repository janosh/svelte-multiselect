import { make_config } from '$lib/vite-config'
import { expect, test } from 'vite-plus/test'

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

// Lint's object members merge a second level down, unlike every other section.
test.each([
  [`rules`, { 'no-var': `off` }],
  [`options`, { typeCheck: false }],
  [`categories`, { perf: `warn` }],
] as const)(`overriding one lint %s entry keeps the rest`, (member, override) => {
  const defaults = make_config()
  const merged = make_config({ lint: { [member]: override } })

  expect(merged.lint).toEqual({
    ...defaults.lint,
    [member]: { ...defaults.lint[member], ...override },
  })
})

test(`a returned config owns its nested state`, () => {
  // Snapshot first; comparing another aliased result after mutation would be vacuous.
  const before = structuredClone(make_config())
  const mine = make_config()
  mine.lint.rules[`no-var`] = `off` // a nested map
  mine.lint.ignorePatterns.push(`LEAKED`) // a nested array
  mine.staged[`*`] = `LEAKED` // a sibling section

  expect(make_config()).toEqual(before)
})
