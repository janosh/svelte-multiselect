<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'
  import { icon_data, type IconName } from './icons'

  let { icon, ...rest }: HTMLAttributes<SVGSVGElement> & { icon: IconName } = $props()

  const data = $derived.by(() => {
    if (!(icon in icon_data)) {
      console.error(`Icon '${icon}' not found`)
      return icon_data.Alert // fallback
    }
    return icon_data[icon]
  })
</script>

<svg viewBox={data.viewBox} fill="currentColor" {...rest}>
  <path d={data.path} />
</svg>

<style>
  svg {
    width: 1em;
    height: 1em;
    display: inline-block;
    vertical-align: middle;
  }
</style>
