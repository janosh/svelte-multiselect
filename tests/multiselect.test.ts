import { cleanup, fireEvent, render } from '@testing-library/svelte'
import { readFileSync } from 'fs'
import { afterEach, expect, test } from 'vitest'
import MultiSelect from '../src/lib'

const options = [`Banana`, `Watermelon`, `Apple`, `Dates`, `Mango`]
const placeholder = `Select fruits`

afterEach(cleanup)

test(`can focus input, enter text, toggle hidden options and select an option`, async () => {
  const { getByText, container, getByPlaceholderText } = render(MultiSelect, {
    options,
    placeholder,
  })

  let ul_ops = container.querySelector(`ul.options`)

  expect(ul_ops?.classList.contains(`hidden`)).to.equal(true)

  const input = getByPlaceholderText(placeholder)
  await fireEvent.focus(input)
  await fireEvent.input(input, { target: { value: `Apple` } })

  // use :last-child here cause for some reason there are two ul.options after toggling showOptions
  // even though {#key showOptions} is supposed to destroy old DOM nodes
  ul_ops = container.querySelector(`ul.options:last-child`)
  expect(ul_ops?.classList.contains(`hidden`)).to.equal(false)

  const apple_op = getByText(`Apple`, {
    selector: `ul:last-child.options > li`,
  })

  await fireEvent.mouseDown(apple_op)

  const apple_sel = getByText(`Apple`, { selector: `ul.selected > li` })
  expect(apple_sel.textContent?.trim()).toBe(`Apple`)
})

test(`readme documents all props`, () => {
  const readme = readFileSync(`readme.md`, `utf8`)

  const instance = new MultiSelect({
    target: document.body,
    props: { options },
  })

  for (const prop of Object.keys(instance.$$.props)) {
    expect(readme).to.contain(prop)
  }
})

test(`remove all button`, async () => {
  const { container, getByPlaceholderText } = render(MultiSelect, {
    options,
    placeholder,
  })

  const input = getByPlaceholderText(placeholder)
  await fireEvent.focus(input)

  const ul_ops = container.querySelector(`ul.options`)

  expect(ul_ops?.children.length).toBe(options.length)

  const li_ops = container.querySelector(`ul.options`)?.children
  for (const li of li_ops ?? []) {
    await fireEvent.mouseDown(li)
  }

  const ul_sel = container.querySelector(`ul.selected`)
  // make sure all options are selected
  expect(ul_sel?.textContent).toContain(`Mango Apple Banana`)

  const rm_all_btn = container.querySelector(`button[title='Remove all']`)
  await fireEvent.mouseUp(rm_all_btn)

  const ul_sel_after = container.querySelector(`ul.selected`)
  expect(ul_sel_after?.textContent).toBe(` `) // only input left
})

test(`default export from index.ts is same as component file`, async () => {
  const { default: comp } = await import(`../src/lib/MultiSelect.svelte`)
  expect(comp).toBe(MultiSelect)
})

// TODO: requires component interaction before classes appear in DOM
// [`liSelectedClass`, `div.multiselect > ul.selected > li`],
// [`liActiveOptionClass`, `div.multiselect > ul.options > li.active`],
for (const [className, selector] of [
  [`outerDivClass`, `div.multiselect`],
  [`ulSelectedClass`, `div.multiselect > ul.selected`],
  [`ulOptionsClass`, `div.multiselect > ul.options`],
  [`liOptionClass`, `div.multiselect > ul.options > li`],
]) {
  test(`${className} attaches to correct DOM node`, async () => {
    const { container } = render(MultiSelect, {
      options,
      [className]: `test-${className}`,
    })

    const dom_node = container.querySelector(`${selector}.test-${className}`)
    expect(dom_node).toBeTruthy()
  })
}
