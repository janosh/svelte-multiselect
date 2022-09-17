import MultiSelect from '$lib'
import { readFileSync } from 'fs'
import { describe, expect, test } from 'vitest'

const readme = readFileSync(`readme.md`, `utf8`)

const prop_delim_start = `1. \`\`\`ts\n   `
const multiselect_src = readFileSync(`src/lib/MultiSelect.svelte`, `utf8`)

describe(`readme`, () => {
  test(`documents all props and their correct types and defaults`, () => {
    const instance = new MultiSelect({
      target: document.body,
      props: { options: [1, 2, 3] },
    })
    const { props, ctx } = instance.$$

    for (const [prop, ctx_idx] of Object.entries(props)) {
      if (prop.endsWith(`Class`)) continue

      let default_val = ctx[ctx_idx as number]
      let type: string = typeof default_val

      if (type === `string`) default_val = `'${default_val}'`
      if (type === `number` && Number.isInteger(default_val)) type = `integer`

      if ([`focusInputOnSelect`].includes(prop)) {
        expect(readme).to.contain(`${prop_delim_start}${prop}: `)
      } else if ([`sortSelected`].includes(prop)) {
        expect(readme).to.contain(`${prop_delim_start}${prop}: `)
        const expected = new RegExp(
          `${prop_delim_start}${prop}: ${type} | .+ = ${default_val}`
        )

        expect(readme).to.match(expected)
      } else if ([`string`, `number`, `boolean`, `integer`].includes(type)) {
        const expected = `${prop_delim_start}${prop}: ${type} = ${default_val}`

        expect(readme).to.contain(expected)
      } else if (default_val === null) {
        const expected = new RegExp(`${prop_delim_start}${prop}: .+ = null`)

        expect(readme).to.match(expected)
      } else {
        expect(readme).to.contain(`${prop_delim_start}${prop}: `)
      }
    }
  })

  test(`documents all CSS variables`, () => {
    for (let line of multiselect_src.split(`\n`)) {
      if (line.includes(`var(--`)) {
        line = line.trim().replace(`;`, ``)
        expect(readme, `${line} not in readme.md`).to.contain(`\`${line}\``)
      }
    }
  })

  test(`documents no non-existent CSS variables`, () => {
    for (let line of readme.split(`\n`)) {
      if (line.includes(`: var(--`)) {
        line = line.split(`)\``)[0].split(`- \``)[1]
        expect(multiselect_src, `${line} not in MultiSelect.svelte`).to.contain(
          line
        )
      }
    }
  })
})
