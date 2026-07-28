<script lang="ts">
  import type { SVGAttributes } from 'svelte/elements'
  import { icon_data, type IconName } from './icons'

  // SVGAttributes, not HTMLAttributes: `width`/`height` are presentation attributes an
  // <svg> legitimately takes, and HTMLAttributes rejects them
  // Either a name from the bundled set, or an ad-hoc glyph for an app's own chrome —
  // never both, never neither, so a bare <Icon /> is a type error rather than a silent
  // fallback. `viewBox`/`stroke` only mean anything alongside `path`, since a named icon
  // carries its own.
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

  const data = $derived.by(() => {
    if (path) return { path, viewBox, stroke }
    if (icon && icon in icon_data) return icon_data[icon]
    console.error(`Icon '${icon}' not found`)
    return icon_data.Alert
  })

  // {@html} is reserved for icon_data, which this package owns. A caller's `path` renders
  // escaped inside <path d> instead, so markup in it cannot inject nodes.
  const markup = $derived(
    !path && data.path.trimStart().startsWith(`<`) ? data.path : null,
  )
</script>

<svg
  role="img"
  viewBox={data.viewBox}
  fill={data.fill ?? (data.stroke ? `none` : `currentColor`)}
  stroke={data.stroke}
  {...rest}
>
  {#if markup != null}
    <!-- several shapes rather than one `d`, so the glyph carries its own markup -->
    {@html markup}
  {:else}
    <path d={data.path} />
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
