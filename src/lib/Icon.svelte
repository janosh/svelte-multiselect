<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'
  import { icon_data, type IconData, type IconName } from './icons'

  // SVGAttributes, not HTMLAttributes, which rejects the `width`/`height` an <svg> takes.
  // Either a bundled name or an ad-hoc glyph for an app's own chrome, never both and
  // never neither, so a bare <Icon /> is a type error rather than a silent fallback.
  let {
    icon,
    path,
    viewBox = `0 0 24 24`,
    stroke,
    ...rest
  }: SVGAttributes<SVGSVGElement> &
    (
      | { icon: IconName; path?: never; viewBox?: never; stroke?: never }
      | { icon?: never; path: string; viewBox?: string; stroke?: string }
    ) = $props()

  const resolved_icon: IconData = $derived.by(() => {
    if (path) return { d: path, viewBox, stroke }
    if (icon && icon in icon_data) return icon_data[icon]
    console.error(`Icon '${icon}' not found`)
    return icon_data.Alert
  })
</script>

<svg
  role="img"
  viewBox={resolved_icon.viewBox}
  fill={resolved_icon.fill ?? (resolved_icon.stroke ? `none` : `currentColor`)}
  stroke={resolved_icon.stroke}
  {...rest}
>
  {#if `markup` in resolved_icon}
    <!-- several shapes rather than one `d`. Only registry glyphs reach {@html}; a
    caller's `path` always becomes the `d` below, so markup in it cannot inject nodes -->
    {@html resolved_icon.markup}
  {:else}
    <path d={resolved_icon.d} />
  {/if}
</svg>

<style>
  svg {
    width: var(--icon-size, 1em);
    /* auto rather than 1em: several glyphs have non-square viewBoxes, which a fixed
       height squashes. Setting --icon-size opts back into a square box. */
    height: var(--icon-size, auto);
    display: inline-block;
    vertical-align: middle;
  }
</style>
