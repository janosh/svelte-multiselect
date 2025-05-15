import src from '$lib/MultiSelect.svelte?raw'
import readme from '$root/readme.md?raw'
import { expect, test } from 'vitest'

const component = `MultiSelect.svelte`

test.skip(`readme documents all props and their correct types and defaults`, () => {
  for (const [idx, line] of src.split(`\n`).entries()) {
    if (line.trim().startsWith(`export let `)) {
      const prop = line.replace(`export let `, ``).split(` //`)[0].trim()
      if (prop.includes(`Class: string = \``)) continue

      const msg = `${component} has prop '${prop}' on line ${
        idx + 1
      } which is not in readme`
      expect(readme, msg).to.contain(`1. \`\`\`ts\n   ${prop}`)
    }
  }
})

test.skip(`readme documents no non-existent props`, () => {
  for (const [idx, line] of readme.split(`\n`).entries()) {
    if (line.startsWith(`1. \`\`\`ts`)) {
      const next_line = readme.split(`\n`)[idx + 1].trim()

      if (next_line.startsWith(`on`)) continue

      const msg = `readme has prop '${next_line}' on line ${
        idx + 1
      } which is not in ${component}`
      expect(src, msg).to.contain(next_line)
    }
  }
})

test.skip(`readme documents all CSS variables`, () => {
  for (const [idx, line] of src.split(`\n`).entries()) {
    if (line.includes(`var(--`)) {
      const css_var = line.trim().replace(`;`, ``)

      const msg = `${component} has CSS variable '${css_var}' on line ${
        idx + 1
      } which is not in readme`
      expect(readme, msg).to.contain(`- \`${css_var}\``)
    }
  }
})

test.skip(`readme documents no non-existent CSS variables`, () => {
  for (const [idx, line] of readme.split(`\n`).entries()) {
    if (line.includes(`: var(--`)) {
      const css_var = line.split(`\``)[1]

      const msg = `readme documents CSS variable '${css_var}' on line ${
        idx + 1
      } which is not in ${component}`
      expect(src, msg).to.contain(css_var)
    }
  }
})
