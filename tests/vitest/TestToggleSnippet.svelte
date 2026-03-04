<script lang="ts">
  import { Toggle } from '$lib'
  import type { ComponentProps } from 'svelte'

  let { ...rest }: ComponentProps<typeof Toggle> = $props()
</script>

<Toggle {...rest}>
  {#snippet children({ checked })}
    <span class="toggle-snippet" data-checked={checked}>label</span>
  {/snippet}
</Toggle>
