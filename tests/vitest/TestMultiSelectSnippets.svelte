<script lang="ts">
  import MultiSelect from '$lib'
  import type { MultiSelectProps } from '$lib/types'

  let { ...rest }: MultiSelectProps = $props()
</script>

<MultiSelect {...rest}>
  {#snippet expandIcon({ open, disabled })}
    <span class="expand-snippet" data-open={open} data-disabled={disabled}>▼</span>
  {/snippet}
  {#snippet removeIcon({ option, isRemoveAll })}
    <span class="remove-snippet" data-option={option} data-is-remove-all={isRemoveAll}
    >✕</span>
  {/snippet}
  {#snippet afterInput({ searchText })}
    <span class="after-input-snippet" data-search-text={searchText}>after</span>
  {/snippet}
  {#snippet groupHeader({ group, options, collapsed })}
    <span
      class="group-header-snippet"
      data-group={group}
      data-count={options.length}
      data-collapsed={collapsed}
    >{group}</span>
  {/snippet}
</MultiSelect>
