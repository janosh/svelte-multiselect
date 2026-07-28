import { Icon } from '$lib'
import { icon_data, type IconName } from '$lib/icons'
import { mount } from 'svelte'
import { describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

describe(`Icon`, () => {
  test.each([
    [`Alert`, `path`],
    [`BandsDOS`, `path`],
    [`BandStructure`, `g`],
    [`Histogram`, `path`],
  ] as const)(`renders %s`, (icon_name, selector) => {
    mount(Icon, { target: document.body, props: { icon: icon_name } })
    const svg = doc_query<SVGSVGElement>(`svg`)
    const expected: { viewBox: string; path: string; stroke?: string; fill?: string } =
      icon_data[icon_name]

    expect(svg.getAttribute(`viewBox`)).toBe(expected.viewBox)
    const { stroke, fill = stroke ? `none` : `currentColor` } = expected
    expect([svg.getAttribute(`fill`), svg.getAttribute(`stroke`)]).toEqual([
      fill,
      stroke ?? null,
    ])
    expect(svg.querySelector(selector)).not.toBeNull()
    if (expected.path.trimStart().startsWith(`<`)) {
      expect(svg.innerHTML).not.toContain(`d="<`)
    } else {
      expect(svg.querySelector(`path`)?.getAttribute(`d`)).toBe(expected.path)
    }
  })

  test(`applies attributes via rest props`, () => {
    const rest_props = {
      style: `width: 2em;`,
      'aria-label': `Checkmark icon`,
      role: `img`,
      'data-name': `disabled-icon`,
    } as const
    mount(Icon, {
      target: document.body,
      props: { icon: `Check`, class: `custom-class`, ...rest_props },
    })

    const svg = doc_query<SVGSVGElement>(`svg`)
    const applied = Object.fromEntries(
      Object.keys(rest_props).map((attr) => [attr, svg.getAttribute(attr)]),
    )
    expect(applied).toEqual(rest_props)
    // class merges with Svelte's scoped class, so it has no verbatim value to compare
    expect(svg.classList.contains(`custom-class`)).toBe(true)
  })

  test(`logs an error and falls back to Alert for an invalid icon`, () => {
    const invalid_icon = `NonExistentIcon`
    const console_error = vi.spyOn(console, `error`).mockImplementation(() => {})

    mount(Icon, {
      target: document.body,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- invalid input
      props: { icon: invalid_icon as IconName },
    })

    expect(console_error).toHaveBeenCalledWith(`Icon '${invalid_icon}' not found`)
    const svg = doc_query<SVGSVGElement>(`svg`)
    expect([
      svg.getAttribute(`viewBox`),
      svg.querySelector(`path`)?.getAttribute(`d`),
    ]).toEqual([icon_data.Alert.viewBox, icon_data.Alert.path])
  })
})
