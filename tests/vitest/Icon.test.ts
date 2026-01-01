import { Icon } from '$lib'
import { icon_data, type IconName } from '$lib/icons'
import { mount } from 'svelte'
import { describe, expect, test, vi } from 'vitest'

describe(`Icon`, () => {
  const get_svg = () => document.body.querySelector(`svg`) as SVGSVGElement

  test.each(Object.keys(icon_data) as IconName[])(
    `renders %s icon with correct viewBox and path`,
    (icon_name) => {
      mount(Icon, { target: document.body, props: { icon: icon_name } })
      const svg = get_svg()
      const expected = icon_data[icon_name]

      expect(svg).toBeTruthy()
      expect(svg.getAttribute(`viewBox`)).toBe(expected.viewBox)
      expect(svg.getAttribute(`fill`)).toBe(`currentColor`)
      expect(svg.querySelector(`path`)?.getAttribute(`d`)).toBe(expected.path)
    },
  )

  test.each(
    [
      [
        `class`,
        `custom-class`,
        (svg: SVGSVGElement) => svg.classList.contains(`custom-class`),
        true,
      ],
      [
        `style`,
        `width: 2em;`,
        (svg: SVGSVGElement) => svg.getAttribute(`style`),
        `width: 2em;`,
      ],
      [
        `aria-label`,
        `Checkmark icon`,
        (svg: SVGSVGElement) => svg.getAttribute(`aria-label`),
        `Checkmark icon`,
      ],
      [`role`, `img`, (svg: SVGSVGElement) => svg.getAttribute(`role`), `img`],
      [
        `data-name`,
        `disabled-icon`,
        (svg: SVGSVGElement) => svg.getAttribute(`data-name`),
        `disabled-icon`,
      ],
    ] as const,
  )(`applies %s attribute via rest props`, (attr, value, getter, expected) => {
    mount(Icon, { target: document.body, props: { icon: `Check`, [attr]: value } })
    expect(getter(get_svg())).toBe(expected)
  })

  test.each([`NonExistentIcon`, ``, `   `])(
    `logs error and falls back to Alert icon for invalid icon: %j`,
    (invalid_icon) => {
      const console_error = vi.spyOn(console, `error`).mockImplementation(() => {})

      // @ts-expect-error - testing invalid icon name
      mount(Icon, { target: document.body, props: { icon: invalid_icon } })

      expect(console_error).toHaveBeenCalledWith(`Icon '${invalid_icon}' not found`)
      expect(get_svg().getAttribute(`viewBox`)).toBe(icon_data.Alert.viewBox)
      expect(get_svg().querySelector(`path`)?.getAttribute(`d`)).toBe(
        icon_data.Alert.path,
      )

      console_error.mockRestore()
    },
  )

  test(`has correct default styles`, () => {
    mount(Icon, { target: document.body, props: { icon: `Check` } })
    const styles = getComputedStyle(get_svg())
    expect(styles.display).toBe(`inline-block`)
    expect(styles.verticalAlign).toBe(`middle`)
  })
})
