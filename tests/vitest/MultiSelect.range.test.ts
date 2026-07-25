import { mount, tick } from 'svelte'
import { expect, test, vi } from 'vite-plus/test'
import MultiSelect from '$lib/MultiSelect.svelte'
import type { MultiSelectProps } from '$lib/types'
import { doc_query } from './index'

const alpha_options = [`Alpha`, `Beta`, `Gamma`, `Delta`]

const option_row = (label: string): HTMLLIElement => {
  const row = [
    ...document.querySelectorAll<HTMLLIElement>(`ul.options > li[role="option"]`),
  ].find((option_item) => option_item.textContent?.trim() === label)
  if (!row) throw new Error(`Option "${label}" not found`)
  return row
}

const mount_multiselect = (props: MultiSelectProps): void => {
  mount(MultiSelect, { target: document.body, props: { rangeSelect: true, ...props } })
}

const shift_click = (label: string): void => {
  option_row(label).dispatchEvent(
    new MouseEvent(`click`, { bubbles: true, shiftKey: true }),
  )
}

const select_range = async (anchor: string, target: string): Promise<void> => {
  option_row(anchor).click()
  await tick()
  shift_click(target)
  await tick()
}

test(`Shift-click adds one visible range and one history entry`, async () => {
  const onrange_select = vi.fn()
  mount_multiselect({
    options: alpha_options,
    selected: [],
    maxOptions: 3,
    onrangeSelect: onrange_select,
  })

  await select_range(`Alpha`, `Delta`)

  expect(onrange_select).toHaveBeenCalledExactlyOnceWith({
    added: alpha_options.slice(1),
    from: `Alpha`,
    to: `Delta`,
    selected: alpha_options,
  })
  doc_query<HTMLInputElement>(`input[role="combobox"]`).dispatchEvent(
    new KeyboardEvent(`keydown`, { key: `z`, ctrlKey: true, bubbles: true }),
  )
  await tick()
  const selected_rows = document.querySelectorAll(`ul.selected > li`)
  expect(selected_rows).toHaveLength(1)
  expect(selected_rows[0]?.textContent).toContain(`Alpha`)
})

test(`Shift+Arrow selects the active range, plain arrows drop the anchor`, async () => {
  const onrange_select = vi.fn()
  mount_multiselect({
    options: alpha_options,
    open: true,
    autoScroll: false,
    onrangeSelect: onrange_select,
  })
  const input = doc_query<HTMLInputElement>(`input[role="combobox"]`)
  const arrow_down = async (shiftKey = false) => {
    input.dispatchEvent(
      new KeyboardEvent(`keydown`, { key: `ArrowDown`, shiftKey, bubbles: true }),
    )
    await tick()
  }

  await arrow_down() // active: Alpha
  await arrow_down(true) // anchor Alpha, range Alpha-Beta
  expect(onrange_select.mock.calls[0][0].added).toEqual([`Alpha`, `Beta`])

  await arrow_down() // plain move to Gamma must not keep Alpha as the anchor
  await arrow_down(true)

  // from=Alpha here would mean the pre-navigation anchor leaked into the new range
  expect(onrange_select).toHaveBeenLastCalledWith({
    added: [`Gamma`, `Delta`],
    from: `Gamma`,
    to: `Delta`,
    selected: alpha_options,
  })
})

test(`Shift-click is an ordinary click while rangeSelect is off`, async () => {
  const onrange_select = vi.fn()
  mount(MultiSelect, {
    target: document.body,
    props: { options: alpha_options, selected: [], onrangeSelect: onrange_select },
  })

  await select_range(`Alpha`, `Delta`)

  expect(onrange_select).not.toHaveBeenCalled()
  expect(document.querySelectorAll(`ul.selected > li`)).toHaveLength(2)
})

test(`range selection skips disabled rows and obeys maxSelect`, async () => {
  const onmaxreached = vi.fn()
  const onrange_select = vi.fn()
  const options = [
    { label: `Alpha` },
    { label: `Beta`, disabled: true },
    { label: `Gamma` },
    { label: `Delta` },
  ]
  mount_multiselect({
    options,
    selected: [],
    maxSelect: 2,
    onmaxreached,
    onrangeSelect: onrange_select,
  })

  await select_range(`Alpha`, `Delta`)

  expect(onrange_select.mock.calls[0][0].selected).toEqual([options[0], options[2]])
  expect(onmaxreached).toHaveBeenCalledOnce()
  expect(onmaxreached.mock.calls[0][0].attemptedOption).toBe(options[3])
})

test(`identical duplicates preserve the clicked occurrence`, async () => {
  const options = [
    { id: 1, label: `Same` },
    { id: 2, label: `Same` },
    { id: 3, label: `Target` },
  ]
  const onrange_select = vi.fn()
  mount_multiselect({
    options,
    duplicates: true,
    key: () => `same`,
    onrangeSelect: onrange_select,
  })
  const rows = document.querySelectorAll<HTMLLIElement>(`ul.options > li[role="option"]`)
  rows[1]?.click()
  await tick()
  rows[2]?.dispatchEvent(new MouseEvent(`click`, { bubbles: true, shiftKey: true }))
  await tick()

  expect(onrange_select.mock.calls[0][0].added).toEqual([options[2]])
})

test(`an invalidated anchor falls back to one ordinary add`, async () => {
  const onadd = vi.fn()
  const onrange_select = vi.fn()
  mount_multiselect({
    options: [`Anchor`, `Target`],
    onadd,
    onrangeSelect: onrange_select,
  })

  option_row(`Anchor`).click()
  await tick()
  onadd.mockClear()
  const input = doc_query<HTMLInputElement>(`input[role="combobox"]`)
  input.value = `Target`
  input.dispatchEvent(new InputEvent(`input`, { bubbles: true }))
  await tick()
  shift_click(`Target`)
  await tick()

  expect(onrange_select).not.toHaveBeenCalled()
  expect(onadd).toHaveBeenCalledExactlyOnceWith({
    option: `Target`,
    selected: [`Anchor`, `Target`],
  })
})
