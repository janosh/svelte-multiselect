<script lang="ts">
  import MultiSelect from '$lib'
  import type { MultiSelectProps } from '$lib/types'

  let {
    snippet_variant = `all`,
    ...rest
  }: MultiSelectProps & { snippet_variant?: `all` | `children` | `option` } = $props()
</script>

{#if snippet_variant === `children`}
  <MultiSelect {...rest}>
    {#snippet children({ option, type })}
      <span data-testid="multiselect-child" data-type={type}>{option}</span>
    {/snippet}
  </MultiSelect>
{:else if snippet_variant === `option`}
  <MultiSelect {...rest}>
    {#snippet option({ option, idx, selected, active, disabled })}
      <span
        data-testid="multiselect-option"
        data-selected={selected}
        data-active={active}
        data-disabled={disabled}
        data-idx={idx}
      >{option}</span>
    {/snippet}
  </MultiSelect>
{:else}
  <MultiSelect {...rest}>
    {#snippet expandIcon({ open, disabled })}
      <span class="expand-snippet" data-open={open} data-disabled={disabled}>▼</span>
    {/snippet}
    {#snippet removeIcon({ option, isRemoveAll })}
      <span class="remove-snippet" data-option={option} data-is-remove-all={isRemoveAll}
      >✕</span>
    {/snippet}
    {#snippet beforeInput({ searchText })}
      <span class="before-input-snippet" data-search-text={searchText}>before</span>
    {/snippet}
    {#snippet afterInput({ searchText })}
      <span class="after-input-snippet" data-search-text={searchText}>after</span>
    {/snippet}
    {#snippet selectedItem({ option, idx })}
      <span class="selected-item-snippet" data-idx={idx}>{option}</span>
    {/snippet}
    {#snippet userMsg({ searchText, msgType, msg })}
      <span
        class="user-msg-snippet"
        data-search-text={searchText}
        data-msg-type={msgType}
      >{msg}</span>
    {/snippet}
    {#snippet spinner()}
      <span class="spinner-snippet">loading</span>
    {/snippet}
    {#snippet disabledIcon()}
      <span class="disabled-icon-snippet">disabled</span>
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
{/if}
