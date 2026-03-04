<script lang="ts">
  import { Nav } from '$lib'
  import type { ComponentProps } from 'svelte'

  let { ...rest }: ComponentProps<typeof Nav> = $props()
</script>

<Nav {...rest}>
  {#snippet link({ href, label, isActive })}
    <a class="link-snippet" {href} data-is-active={isActive}>{label}</a>
  {/snippet}
</Nav>
