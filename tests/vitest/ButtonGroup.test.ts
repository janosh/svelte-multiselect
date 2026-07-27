import ButtonGroup from '$lib/ButtonGroup.svelte'
import button_group_source from '$lib/ButtonGroup.svelte?raw'
import type { ComponentProps } from 'svelte'
import { createRawSnippet, mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

describe(`ButtonGroup`, () => {
  type Props = Partial<ComponentProps<typeof ButtonGroup>>
  // the option object arm of the `options` union, i.e. ButtonGroupOption. Spelled out
  // rather than imported: only svelte-check reads types out of a .svelte module script
  type Option = {
    value: string
    label?: string
    tooltip?: string
    icon?: `Check`
    disabled?: boolean
    loading?: boolean
  }

  const mounted: Record<string, unknown>[] = []
  afterEach(() => {
    for (const app of mounted.splice(0)) void unmount(app)
  })

  const mount_group = (props: Props) => {
    // options is required; every test passes one, the cast keeps call sites terse
    const full_props = props as ComponentProps<typeof ButtonGroup>
    mounted.push(mount(ButtonGroup, { target: document.body, props: full_props }))
    return [...document.querySelectorAll<HTMLButtonElement>(`.options button`)]
  }
  const values_of = (buttons: HTMLButtonElement[]) =>
    buttons.map((button) => button.dataset.value)
  // whichever attribute the current mode uses, so a mode swap can't pass silently
  const checked_state = (button: HTMLButtonElement) =>
    button.getAttribute(`aria-checked`) ?? button.getAttribute(`aria-pressed`)
  const press = (key: string, target: Element | null = document.activeElement) =>
    target?.dispatchEvent(
      new KeyboardEvent(`keydown`, { key, bubbles: true, cancelable: true }),
    )

  const letters = { alpha: `Alpha`, beta: `Beta`, gamma: `Gamma` }

  test.each([
    [`bare values`, [`alpha`, `beta`, `gamma`], [`alpha`, `beta`, `gamma`]],
    [`record`, letters, [`Alpha`, `Beta`, `Gamma`]],
    [
      `tuples`,
      [
        [`alpha`, `Alpha`],
        [`beta`, `Beta`],
        [`gamma`, `Gamma`],
      ],
      [`Alpha`, `Beta`, `Gamma`],
    ],
    [
      `option objects`,
      [
        { value: `alpha`, label: `Alpha` },
        { value: `beta`, label: `Beta` },
        {
          value: `gamma`,
        },
      ],
      [`Alpha`, `Beta`, `gamma`], // a label-less object falls back to its value
    ],
  ] as const)(`renders %s as one button per option`, (_desc, options, labels) => {
    const buttons = mount_group({ options, selected: `beta` })

    expect(values_of(buttons)).toEqual([`alpha`, `beta`, `gamma`])
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(labels)
    // the value, not the label, is what selection compares against
    expect(buttons.map(checked_state)).toEqual([`false`, `true`, `false`])
  })

  test(`throws on an option shape it cannot read`, () => {
    expect(() => mount_group({ options: [{ label: `no value` }] as never })).toThrow(
      /unsupported option/,
    )
  })

  test.each([
    [false, `radiogroup`, `radio`, `aria-checked`, `aria-pressed`],
    [true, `group`, null, `aria-pressed`, `aria-checked`],
  ] as const)(
    `multiple=%s uses %s semantics`,
    (multiple, group_role, button_role, used_attr, unused_attr) => {
      // `multiple` discriminates the props union, so it has to reach mount_group as a
      // literal; passing the loop variable widens it to boolean and matches neither arm
      const buttons = mount_group(
        multiple
          ? {
              options: letters,
              multiple: true,
              label: `Greek letters`,
              selected: [`beta`],
            }
          : {
              options: letters,
              multiple: false,
              label: `Greek letters`,
              selected: `beta`,
            },
      )

      const group = doc_query(`.options`)
      expect(group.getAttribute(`role`)).toBe(group_role)
      expect(group.getAttribute(`aria-label`)).toBe(`Greek letters`)
      expect(buttons.map((button) => button.getAttribute(`role`))).toEqual(
        Array(3).fill(button_role),
      )
      expect(buttons.map((button) => button.getAttribute(used_attr))).toEqual([
        `false`,
        `true`,
        `false`,
      ])
      // the mode's own attribute only: aria-pressed on a radio would announce twice
      expect(buttons.map((button) => button.getAttribute(unused_attr))).toEqual(
        Array(3).fill(null),
      )
      expect(buttons.every((button) => button.type === `button`)).toBe(true)
    },
  )

  test(`single select replaces the selection and never clears it`, async () => {
    const on_change = vi.fn()
    const buttons = mount_group({ options: letters, selected: `alpha`, on_change })

    buttons[2].click()
    await tick()
    expect(on_change.mock.calls).toEqual([[`gamma`]])
    expect(buttons.map(checked_state)).toEqual([`false`, `false`, `true`])

    buttons[2].click() // re-picking the checked radio is a no-op, not a deselect
    await tick()
    expect(on_change).toHaveBeenCalledOnce()
    expect(buttons.map(checked_state)).toEqual([`false`, `false`, `true`])
  })

  test(`multi select toggles each option independently`, async () => {
    const on_change = vi.fn()
    const buttons = mount_group({ options: letters, multiple: true, on_change })
    expect(buttons.map(checked_state)).toEqual([`false`, `false`, `false`])

    buttons[0].click()
    await tick()
    buttons[2].click()
    await tick()
    expect(buttons.map(checked_state)).toEqual([`true`, `false`, `true`])

    buttons[0].click() // second press removes it, leaving the other selection alone
    await tick()
    expect(buttons.map(checked_state)).toEqual([`false`, `false`, `true`])
    expect(on_change.mock.calls).toEqual([[[`alpha`]], [[`alpha`, `gamma`]], [[`gamma`]]])
  })

  test(`arrow keys move focus and the selection with it, wrapping both ends`, async () => {
    const on_change = vi.fn()
    const buttons = mount_group({ options: letters, selected: `alpha`, on_change })
    buttons[0].focus()

    const walk: [string, number][] = [
      [`ArrowRight`, 1],
      [`ArrowDown`, 2],
      [`ArrowRight`, 0], // wraps past the end
      [`ArrowLeft`, 2], // and back past the start
      [`ArrowUp`, 1],
      [`Home`, 0],
      [`End`, 2],
    ]
    for (const [key, expected_idx] of walk) {
      press(key)
      await tick()
      expect(document.activeElement, key).toBe(buttons[expected_idx])
      expect(checked_state(buttons[expected_idx]), key).toBe(`true`)
    }
    expect(on_change.mock.calls.flat()).toEqual([
      `beta`,
      `gamma`,
      `alpha`,
      `gamma`,
      `beta`,
      `alpha`,
      `gamma`,
    ])
  })

  test(`arrow keys in multi select move focus without selecting`, async () => {
    const on_change = vi.fn()
    const buttons = mount_group({ options: letters, multiple: true, on_change })
    buttons[0].focus()

    press(`ArrowRight`)
    await tick()
    expect(document.activeElement).toBe(buttons[1])
    expect(buttons.map(checked_state)).toEqual([`false`, `false`, `false`])
    expect(on_change).not.toHaveBeenCalled()

    buttons[1].click() // Space/Enter reach the same handler via a native button click
    await tick()
    expect(buttons.map(checked_state)).toEqual([`false`, `true`, `false`])
  })

  test.each([
    [`ArrowLeft`, 2],
    [`ArrowUp`, 2],
    [`ArrowRight`, 0],
    [`Home`, 0],
    [`End`, 2],
  ] as const)(`%s enters the group at the right end from outside`, async (key, idx) => {
    const buttons = mount_group({ options: letters })
    ;(document.activeElement as HTMLElement | null)?.blur()

    press(key, doc_query(`.options`))
    await tick()
    expect(document.activeElement).toBe(buttons[idx])
  })

  test(`disabled options are skipped by clicks and by arrow keys`, async () => {
    const on_change = vi.fn()
    const options: Option[] = [
      { value: `alpha`, label: `Alpha` },
      { value: `beta`, label: `Beta`, disabled: true },
      { value: `gamma`, label: `Gamma` },
    ]
    const buttons = mount_group({ options, selected: `alpha`, on_change })
    expect(buttons.map((button) => button.disabled)).toEqual([false, true, false])

    buttons[0].focus()
    press(`ArrowRight`)
    await tick()
    expect(document.activeElement).toBe(buttons[2]) // beta skipped
    expect(checked_state(buttons[2])).toBe(`true`)

    press(`ArrowRight`)
    await tick()
    expect(document.activeElement).toBe(buttons[0]) // wraps over beta too
    expect(on_change.mock.calls.flat()).toEqual([`gamma`, `alpha`])
  })

  test(`the whole group can be disabled, which also mutes the keyboard`, async () => {
    const on_change = vi.fn()
    const buttons = mount_group({
      options: letters,
      disabled: true,
      sort_order: `asc`,
      on_change,
    })
    expect(buttons.every((button) => button.disabled)).toBe(true)
    expect(doc_query<HTMLButtonElement>(`.sort-order`).disabled).toBe(true)

    press(`ArrowRight`, doc_query(`.options`))
    await tick()
    expect(on_change).not.toHaveBeenCalled()
  })

  test.each([
    [`the checked option`, `gamma`, 2],
    [`the first option when nothing is selected`, undefined, 0],
    [`the first option when the selection matches nothing`, `delta`, 0],
  ])(`roving tabindex sits on %s`, (_desc, selected, tabbable_idx) => {
    const buttons = mount_group({ options: letters, selected })

    expect(buttons.map((button) => button.tabIndex)).toEqual(
      [0, 1, 2].map((idx) => (idx === tabbable_idx ? 0 : -1)),
    )
  })

  test(`multi select leaves every button tabbable`, () => {
    const buttons = mount_group({ options: letters, multiple: true, selected: [`beta`] })

    expect(buttons.map((button) => button.getAttribute(`tabindex`))).toEqual(
      Array(3).fill(null),
    )
  })

  test(`the sort arrow is opt-in`, () => {
    mount_group({ options: letters })
    expect(document.querySelector(`.sort-order`)).toBeNull()
  })

  test(`the sort arrow flips between asc and desc`, async () => {
    mount_group({ options: letters, sort_order: `asc` })

    const arrow = doc_query<HTMLButtonElement>(`.sort-order`)
    expect([arrow.textContent?.trim(), arrow.getAttribute(`aria-label`)]).toEqual([
      `↑`,
      `Sort ascending`,
    ])
    // it sits outside the radiogroup, which may only own radios
    expect(arrow.closest(`.options`)).toBeNull()

    arrow.click()
    await tick()
    expect([arrow.textContent?.trim(), arrow.getAttribute(`aria-label`)]).toEqual([
      `↓`,
      `Sort descending`,
    ])

    arrow.click()
    await tick()
    expect(arrow.textContent?.trim()).toBe(`↑`)
  })

  test(`renders per-option icon and spinner, and forwards class and rest props`, () => {
    const options: Option[] = [
      { value: `alpha`, label: `Alpha`, icon: `Check` },
      { value: `beta`, label: `Beta`, loading: true },
    ]
    const buttons = mount_group({ options, class: `consumer-class`, id: `letters` })

    expect(buttons[0].querySelector(`svg`)).not.toBeNull()
    expect(buttons[1].querySelector(`svg`)).toBeNull()
    // CircleSpinner is a bare div sized by inline styles
    expect(buttons[1].querySelector(`div`)?.style.width).toBe(`0.8em`)

    const wrapper = doc_query(`#letters`)
    expect(wrapper.classList.contains(`button-group`)).toBe(true)
    expect(wrapper.classList.contains(`consumer-class`)).toBe(true)
  })

  test(`an option snippet replaces the default button content`, () => {
    // wider than the component's own param type, which is how a snippet stays
    // assignable to it (parameters are contravariant)
    const option = createRawSnippet<[{ option: { label?: string }; selected: boolean }]>(
      (get_params) => ({
        render: () => {
          const { option: opt, selected } = get_params()
          return `<span data-testid="custom">${opt.label}:${selected}</span>`
        },
      }),
    )
    const buttons = mount_group({ options: letters, selected: `beta`, option })

    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      `Alpha:false`,
      `Beta:true`,
      `Gamma:false`,
    ])
  })

  test(`per-option tooltips show on hover, options without one stay silent`, async () => {
    vi.useFakeTimers()
    try {
      const options: Option[] = [
        { value: `alpha`, label: `Alpha`, tooltip: `first letter` },
        { value: `beta`, label: `Beta` },
      ]
      const buttons = mount_group({ options })
      await tick()

      buttons[1].dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      vi.runAllTimers()
      expect(document.querySelector(`.tooltip-content`)).toBeNull()

      buttons[0].dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      vi.runAllTimers()
      expect(doc_query(`.tooltip-content`).textContent).toBe(`first letter`)
    } finally {
      vi.useRealTimers()
    }
  })

  // without a pass-through, tooltip content is escaped, which blocks any consumer whose
  // option tooltips are rich text
  test(`tooltip_options reaches the tooltip, so allow_html works`, async () => {
    vi.useFakeTimers()
    try {
      const options: Option[] = [{ value: `a`, tooltip: `<strong>bold</strong>` }]
      const buttons = mount_group({ options, tooltip_options: { allow_html: true } })
      await tick()

      buttons[0].dispatchEvent(new MouseEvent(`mouseenter`, { bubbles: true }))
      vi.runAllTimers()
      expect(doc_query(`.tooltip-content`).innerHTML).toContain(`<strong>bold</strong>`)
    } finally {
      vi.useRealTimers()
    }
  })

  // `as` exists so a group can sit in a heading or paragraph, where a div is invalid.
  // The inner options wrapper has to follow, or the root is legal and its child isn't.
  test.each([
    [`div`, undefined],
    [`span`, `span` as const],
  ])(`renders a %s root with a phrasing-safe options wrapper`, (expected_tag, as) => {
    mount_group({ options: [`alpha`], ...(as ? { as } : {}) })

    expect(doc_query(`.button-group`).tagName.toLowerCase()).toBe(expected_tag)
    expect(doc_query(`.options`).tagName.toLowerCase()).toBe(`span`)
  })

  // The `font` shorthand would also set weight and style, and since `.button-group
  // button` outranks a consumer's own `button {}` rule it silently overrode their
  // global button typography. Asserted against the source because happy-dom drops
  // nested CSS rules, so the mounted stylesheet reports `.button-group {}` as empty.
  test(`leaves font-weight and font-style to the consumer`, () => {
    const styles = button_group_source.slice(button_group_source.indexOf(`<style>`))
    expect(styles).toMatch(/font-family:\s*var\(--btn-group-btn-font-family/u)
    expect(styles).not.toMatch(/[^-]font:\s*inherit/u)
  })
})
