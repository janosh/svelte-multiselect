<script lang="ts">
  import MultiSelect from '$lib'
  import type { MultiSelectProps } from '$lib/types'

  let { ...rest }: MultiSelectProps = $props()
</script>

<MultiSelect {...rest}>
  {#snippet children({ option, type })}
    <span class="child-snippet" data-type={type}>{option}</span>
  {/snippet}
</MultiSelect>
