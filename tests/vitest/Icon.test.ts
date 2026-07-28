import { Icon } from '$lib'
import { icon_data, type IconData, type IconName } from '$lib/icons'
import { mount } from 'svelte'
import { describe, expect, test, vi } from 'vite-plus/test'
import { doc_query } from './index'

describe(`Icon`, () => {
  // Every entry, not a sample: the set is merged from another repo, and markup holding
  // several shapes rather than one `d` renders as nothing unless Icon spots the markup.
  // Offenders are collected so a bad merge names every icon it broke, not just the first.
  test(`every icon renders its viewBox, fill, stroke and shape`, () => {
    const offenders: string[] = []
    // annotated because the inferred literal types drop the optional keys entirely
    for (const [name, entry] of Object.entries<IconData>(icon_data)) {
      document.body.innerHTML = ``
      mount(Icon, { target: document.body, props: { icon: name as IconName } })
      const svg = doc_query<SVGSVGElement>(`svg`)
      const { viewBox, stroke, fill = stroke ? `none` : `currentColor` } = entry

      if (svg.getAttribute(`viewBox`) !== viewBox) offenders.push(`${name}: viewBox`)
      if (svg.getAttribute(`role`) !== `img`) offenders.push(`${name}: role`)
      if (svg.getAttribute(`fill`) !== fill) offenders.push(`${name}: fill`)
      if ((svg.getAttribute(`stroke`) ?? undefined) !== stroke) {
        offenders.push(`${name}: stroke`)
      }
      if (`markup` in entry) {
        if (svg.childElementCount === 0) offenders.push(`${name}: markup`)
        if (svg.innerHTML.includes(`d="<`)) offenders.push(`${name}: markup in d`)
      } else if (svg.querySelector(`path`)?.getAttribute(`d`) !== entry.d) {
        offenders.push(`${name}: d`)
      }
    }
    expect(offenders).toEqual([])
  })

  test.each([`Issues`, `Materials`, `Maximize`, `NeuralNetwork`, `Versions`] as const)(
    `defines %s as a currentColor stroke`,
    (name) => {
      expect(icon_data[name].stroke).toBe(`currentColor`)
    },
  )

  test(`Histogram contains one baseline subpath`, () => {
    expect(icon_data.Histogram.d.match(/M4 42h40/g)).toHaveLength(1)
  })

  test(`applies attributes via rest props`, () => {
    const rest_props = {
      style: `width: 2em;`,
      'aria-label': `Checkmark icon`,
      role: `presentation`, // beats the component's own role="img"
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

  // happy-dom does no layout, so the sizing contract is read off the source. `auto`
  // height is what keeps the non-square viewBoxes from being squashed.
  test(`sizes off --icon-size, defaulting height to auto`, async () => {
    const { default: source } = await import(`$lib/Icon.svelte?raw`)
    expect(source).toContain(`width: var(--icon-size, 1em)`)
    expect(source).toContain(`height: var(--icon-size, auto)`)
  })

  // For an app's own chrome glyphs, which do not belong in the shared set
  test(`renders a caller-supplied path, and never injects markup through it`, () => {
    mount(Icon, { target: document.body, props: { path: `M5 5`, viewBox: `0 0 10 10` } })
    const plain = doc_query<SVGSVGElement>(`svg`)
    expect(plain.querySelector(`path`)?.getAttribute(`d`)).toBe(`M5 5`)
    expect(plain.getAttribute(`viewBox`)).toBe(`0 0 10 10`)

    // {@html} is reserved for icon_data, so a caller's path lands escaped in `d`
    document.body.innerHTML = ``
    const injection = `<circle cx="12" r="10" />`
    mount(Icon, { target: document.body, props: { path: injection, stroke: `red` } })
    const svg = doc_query<SVGSVGElement>(`svg`)
    expect(svg.querySelector(`circle`)).toBeNull()
    expect(svg.querySelector(`path`)?.getAttribute(`d`)).toBe(injection)
    expect([svg.getAttribute(`stroke`), svg.getAttribute(`fill`)]).toEqual([
      `red`,
      `none`,
    ])
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
    ]).toEqual([icon_data.Alert.viewBox, icon_data.Alert.d])
  })
})
