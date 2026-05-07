<script lang="ts">
  import MultiSelect from '$lib'
  import type { Test2WayBindProps } from './index'

  let {
    activeIndex = null,
    activeOption = null,
    maxSelect = $bindable(null),
    options = $bindable(),
    selected = $bindable(
      options
        ?.filter((opt) => opt instanceof Object && opt?.preselected)
        .slice(0, maxSelect ?? undefined) ?? [],
    ),
    searchText = $bindable(``),
    value = $bindable(null),
    breakpoint = $bindable(800),
    open = $bindable(false),
    onActiveIndexChanged,
    onActiveOptionChanged,
    onOptionsChanged,
    onSearchTextChanged,
    onSelectedChanged,
    onValueChanged,
    ...rest
  }: Test2WayBindProps = $props()

  $effect.pre(() => {
    onActiveIndexChanged?.(activeIndex)
  })
  $effect.pre(() => {
    onActiveOptionChanged?.(activeOption)
  })
  $effect.pre(() => {
    onOptionsChanged?.(options)
  })
  $effect.pre(() => {
    onSearchTextChanged?.(searchText)
  })
  $effect.pre(() => {
    onSelectedChanged?.(selected)
  })
  $effect.pre(() => {
    onValueChanged?.(value)
  })

  export { breakpoint, maxSelect, searchText, selected, value }
</script>

<MultiSelect
  bind:maxSelect
  bind:activeIndex
  bind:activeOption
  bind:options
  bind:searchText
  bind:selected
  bind:value
  bind:open
  {...rest}
/>
