<script lang="ts">
  import MultiSelect from '$lib'
  import type { MultiSelectProps } from '$lib/types'

  let { ...rest }: MultiSelectProps = $props()
</script>

<MultiSelect {...rest}>
  {#snippet option({ option, idx, selected, active, disabled })}
    <span
      class="option-snippet"
      data-selected={selected}
      data-active={active}
      data-disabled={disabled}
      data-idx={idx}
    >{option}</span>
  {/snippet}
</MultiSelect>
