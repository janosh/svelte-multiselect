<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { icon_data, type IconName } from './icons'

  let { icon, ...rest }: HTMLAttributes<SVGSVGElement> & { icon: IconName } = $props()

  const data = $derived.by(() => {
    if (!(icon in icon_data)) {
      console.error(`Icon '${icon}' not found`)
      return icon_data.Alert
    }
    return icon_data[icon]
  })
</script>

<svg
  viewBox={data.viewBox}
  fill={data.fill ?? (data.stroke ? `none` : `currentColor`)}
  stroke={data.stroke}
  {...rest}
>
  {#if data.path.trimStart().startsWith(`<`)}
    <!-- trusted package-owned markup -->
    {@html data.path}
  {:else}
    <path d={data.path} />
  {/if}
</svg>

<style>
  svg {
    width: 1em;
    height: 1em;
    display: inline-block;
    vertical-align: middle;
  }
</style>
