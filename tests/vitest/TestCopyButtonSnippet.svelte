<script lang="ts">
  import { CopyButton } from '$lib'
  import type { ComponentProps } from 'svelte'

  let { ...rest }: ComponentProps<typeof CopyButton> = $props()
</script>

<CopyButton {...rest}>
  {#snippet children({ state, disabled })}
    <span class="copy-snippet" data-state={state} data-disabled={disabled}>{state}</span>
  {/snippet}
</CopyButton>
