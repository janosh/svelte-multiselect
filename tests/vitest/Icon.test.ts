import { Icon } from '$lib'
import { icon_data, type IconName } from '$lib/icons'
import { mount } from 'svelte'
import { describe, expect, test, vi } from 'vite-plus/test'

describe(`Icon`, () => {
  const get_svg = () => document.body.querySelector<SVGSVGElement>(`svg`)

  test.each(Object.keys(icon_data).filter((key): key is IconName => key in icon_data))(
    `renders %s icon with correct viewBox and path`,
    (icon_name) => {
      mount(Icon, { target: document.body, props: { icon: icon_name } })
      const svg = get_svg()
      const expected = icon_data[icon_name]

      expect(svg).toBeInstanceOf(SVGElement)
      expect(svg?.getAttribute(`viewBox`)).toBe(expected.viewBox)
      expect(svg?.getAttribute(`fill`)).toBe(`currentColor`)
      expect(svg?.querySelector(`path`)?.getAttribute(`d`)).toBe(expected.path)
    },
  )

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

    const svg = get_svg()
    const applied = Object.fromEntries(
      Object.keys(rest_props).map((attr) => [attr, svg?.getAttribute(attr)]),
    )
    expect(applied).toEqual(rest_props)
    // class merges with Svelte's scoped class, so it has no verbatim value to compare
    expect(svg?.classList.contains(`custom-class`)).toBe(true)
  })

  test.each([`NonExistentIcon`, ``, `   `])(
    `logs error and falls back to Alert icon for invalid icon: %j`,
    (invalid_icon) => {
      const console_error = vi.spyOn(console, `error`).mockImplementation(() => {})

      mount(Icon, {
        target: document.body,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- testing invalid icon name
        props: { icon: invalid_icon as IconName },
      })

      expect(console_error).toHaveBeenCalledWith(`Icon '${invalid_icon}' not found`)
      const svg = get_svg()
      expect([
        svg?.getAttribute(`viewBox`),
        svg?.querySelector(`path`)?.getAttribute(`d`),
      ]).toEqual([icon_data.Alert.viewBox, icon_data.Alert.path])
    },
  )
})
