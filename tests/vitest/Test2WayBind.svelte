<script lang="ts">
  import MultiSelect from '$lib'
  import type { Test2WayBindProps } from './index'

  let {
    activeIndex = null,
    activeOption = null,
    maxSelect = null,
    options = $bindable(),
    selected = $bindable(
      options
        ?.filter((opt) => opt instanceof Object && opt?.preselected)
        .slice(0, maxSelect ?? undefined) ?? [],
    ),
    value = $bindable(null),
    breakpoint = $bindable(800),
    open = $bindable(false),
    onActiveIndexChanged,
    onActiveOptionChanged,
    onOptionsChanged,
    onSelectedChanged,
    onValueChanged,
    ...restProps
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
    onSelectedChanged?.(selected)
  })
  $effect.pre(() => {
    onValueChanged?.(value)
  })

  export { breakpoint, selected, value }
</script>

<MultiSelect
  {maxSelect}
  bind:activeIndex
  bind:activeOption
  bind:options
  bind:selected
  bind:value
  bind:open
  {...restProps}
/>
