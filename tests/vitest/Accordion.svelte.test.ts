import Accordion from '$lib/Accordion.svelte'
import type { AccordionItem } from '$lib/types'
import type { ComponentProps } from 'svelte'
import { createRawSnippet, mount, tick } from 'svelte'
import { describe, expect, test, vi } from 'vite-plus/test'
import TestNestedAccordion from './TestNestedAccordion.svelte'
import { press_key } from './index'

describe(`Accordion`, () => {
  const items = [
    { value: `alpha`, label: `Alpha` },
    { value: `disabled`, label: `Disabled`, disabled: true },
    { value: `gamma`, label: `Gamma` },
  ] satisfies AccordionItem[]
  type Props = ComponentProps<typeof Accordion>

  const mount_accordion = (extra: Partial<Props> = {}) => {
    const props: Props = $state({ items, ...extra })
    mount(Accordion, { target: document.body, props })
    return props
  }
  const triggers = () => [
    ...document.querySelectorAll<HTMLButtonElement>(`button.accordion-trigger`),
  ]
  const panels = () => [...document.querySelectorAll<HTMLDivElement>(`[role="region"]`)]

  test(`ComponentProps remains usable through Partial`, () => {
    const consumer_props: Partial<Props> = {
      multiple: true,
      value: [`alpha`],
      on_change: vi.fn(),
    }
    expect(consumer_props).toMatchObject({ multiple: true, value: [`alpha`] })
  })

  test(`renders heading buttons linked to labelled regions`, async () => {
    const props = mount_accordion({ value: `gamma`, heading_level: 4 })
    expect(document.querySelectorAll(`h4.accordion-heading`)).toHaveLength(3)
    const initial_ids = triggers().map((trigger) => trigger.id)
    expect(
      triggers().map((trigger, trigger_idx) => [
        trigger.textContent?.trim(),
        trigger.getAttribute(`aria-expanded`),
        trigger.getAttribute(`aria-disabled`),
        trigger.getAttribute(`aria-controls`),
        panels()[trigger_idx].id,
        panels()[trigger_idx].getAttribute(`aria-labelledby`),
        panels()[trigger_idx].hidden,
      ]),
    ).toEqual([
      [`Alpha`, `false`, null, panels()[0].id, panels()[0].id, triggers()[0].id, true],
      [
        `Disabled`,
        `false`,
        `true`,
        panels()[1].id,
        panels()[1].id,
        triggers()[1].id,
        true,
      ],
      [`Gamma`, `true`, null, panels()[2].id, panels()[2].id, triggers()[2].id, false],
    ])

    props.value = `alpha`
    await tick()
    expect(triggers().map((trigger) => trigger.id)).toEqual(initial_ids)
    expect(triggers().map((trigger) => trigger.getAttribute(`aria-expanded`))).toEqual([
      `true`,
      `false`,
      `false`,
    ])
  })

  test(`single mode controls one open item and permits collapsing it`, async () => {
    const on_change = vi.fn()
    const props = mount_accordion({ value: null, on_change })

    triggers()[0].click()
    await tick()
    expect(props.value).toBe(`alpha`)
    expect(panels().map((panel) => panel.hidden)).toEqual([false, true, true])
    expect(on_change).toHaveBeenLastCalledWith(`alpha`)

    triggers()[2].click()
    await tick()
    expect(props.value).toBe(`gamma`)
    expect(panels().map((panel) => panel.hidden)).toEqual([true, true, false])
    expect(on_change).toHaveBeenLastCalledWith(`gamma`)

    triggers()[2].click()
    await tick()
    expect(props.value).toBeNull()
    expect(on_change).toHaveBeenLastCalledWith(null)

    triggers()[1].click()
    expect(props.value).toBeNull()
    expect(on_change).toHaveBeenCalledTimes(3)
  })

  test(`multiple mode adds and removes controlled values independently`, async () => {
    const on_change = vi.fn()
    const props = mount_accordion({ multiple: true, value: [`alpha`], on_change })

    triggers()[2].click()
    await tick()
    expect(props.value).toEqual([`alpha`, `gamma`])
    expect(triggers().map((trigger) => trigger.getAttribute(`aria-expanded`))).toEqual([
      `true`,
      `false`,
      `true`,
    ])
    expect(on_change).toHaveBeenLastCalledWith([`alpha`, `gamma`])

    triggers()[0].click()
    await tick()
    expect(props.value).toEqual([`gamma`])
    expect(on_change).toHaveBeenLastCalledWith([`gamma`])
  })

  // An uncontrolled accordion falls back to the empty shape for its mode, and a value
  // whose shape belongs to the other mode reads as nothing open rather than throwing.
  test.each([
    [`uncontrolled single`, {}, [true, true, true]],
    [`uncontrolled multiple`, { multiple: true }, [true, true, true]],
    [`array value in single mode`, { value: [`alpha`] }, [true, true, true]],
    [
      `single value in multiple mode`,
      { multiple: true, value: `alpha` },
      [true, true, true],
    ],
    [
      `matching multiple value`,
      { multiple: true, value: [`alpha`, `gamma`] },
      [false, true, false],
    ],
  ] as [string, Partial<Props>, boolean[]][])(`%s`, (_name, props, hidden) => {
    mount_accordion(props)
    expect(panels().map((panel) => panel.hidden)).toEqual(hidden)
  })

  test(`arrow, Home and End keys move focus across enabled headings`, () => {
    mount_accordion({ value: `alpha` })
    triggers()[0].focus()

    for (const [key, expected_idx] of [
      [`ArrowDown`, 2],
      [`ArrowDown`, 0],
      [`ArrowUp`, 2],
      [`Home`, 0],
      [`End`, 2],
    ] as const) {
      const event = press_key(document.activeElement ?? document.body, key)
      expect(event.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(triggers()[expected_idx])
    }
    expect(triggers().map((trigger) => trigger.getAttribute(`aria-expanded`))).toEqual([
      `true`,
      `false`,
      `false`,
    ])

    const left = press_key(document.activeElement ?? document.body, `ArrowLeft`)
    expect(left.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(triggers()[2])
  })

  test(`nested accordions keep arrow navigation within the owning root`, () => {
    mount(TestNestedAccordion, { target: document.body })
    const inner_root = document.querySelectorAll(`.accordion`)[1]
    const inner_triggers = [
      ...inner_root.querySelectorAll<HTMLButtonElement>(`button.accordion-trigger`),
    ]

    inner_triggers[0].focus()
    press_key(inner_triggers[0], `ArrowDown`)

    expect(document.activeElement).toBe(inner_triggers[1])
  })

  test(`trigger and panel snippets receive item and open state`, () => {
    const trigger = createRawSnippet<[{ item: AccordionItem; open: boolean }]>(
      (get_params) => ({
        render: () => {
          const { item, open } = get_params()
          return `<span data-trigger="${item.value}">${item.label}/${open}</span>`
        },
      }),
    )
    const panel = createRawSnippet<[{ item: AccordionItem; open: boolean }]>(
      (get_params) => ({
        render: () => {
          const { item, open } = get_params()
          return `<p data-panel="${item.value}">${item.value}/${open}</p>`
        },
      }),
    )
    mount_accordion({ value: `alpha`, trigger, panel })

    expect(triggers().map((trigger_el) => trigger_el.textContent)).toEqual([
      `Alpha/true`,
      `Disabled/false`,
      `Gamma/false`,
    ])
    expect(panels().map((panel_el) => panel_el.textContent)).toEqual([
      `alpha/true`,
      `disabled/false`,
      `gamma/false`,
    ])
  })
})
