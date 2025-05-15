<script lang="ts">
  import MultiSelect, { type MultiSelectProps } from '$lib'

  export type Test2WayBindProps = MultiSelectProps & {
    onActiveIndexChanged?: (data: MultiSelectProps[`activeIndex`]) => unknown
    onActiveOptionChanged?: (data: MultiSelectProps[`activeOption`]) => unknown
    onOptionsChanged?: (data: MultiSelectProps[`options`]) => unknown
    onSelectedChanged?: (data: MultiSelectProps[`selected`]) => unknown
    onValueChanged?: (data: MultiSelectProps[`value`]) => unknown
  }

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

  export {
    activeIndex,
    activeOption,
    breakpoint,
    maxSelect,
    options,
    selected,
    value,
    open,
  }
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
