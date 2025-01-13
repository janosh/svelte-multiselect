<script lang="ts">
  import MultiSelect, { type MultiSelectProps } from '$lib'

  export type Test2WayBindProps = MultiSelectProps & {
    onActiveIndexChanged?: (data: MultiSelectProps['activeIndex']) => unknown
    onActiveOptionChanged?: (data: MultiSelectProps['activeOption']) => unknown
    onOptionsChanged?: (data: MultiSelectProps['options']) => unknown
    onSelectedChanged?: (data: MultiSelectProps['selected']) => unknown
    onValueChanged?: (data: MultiSelectProps['value']) => unknown
  }

  let {
    activeIndex = $bindable(null),
    activeOption = $bindable(null),
    maxSelect = null,
    options = $bindable(),
    selected = $bindable([]),
    value = $bindable(null),
    onActiveIndexChanged,
    onActiveOptionChanged,
    onOptionsChanged,
    onSelectedChanged,
    onValueChanged,
    ...restProps
  }: Test2WayBindProps = $props()

  $effect(() => {
    onActiveIndexChanged?.(activeIndex)
  })
  $effect(() => {
    onActiveOptionChanged?.(activeOption)
  })
  $effect(() => {
    onOptionsChanged?.(options)
  })
  $effect(() => {
    onSelectedChanged?.(selected)
  })
  $effect(() => {
    onValueChanged?.(value)
  })

  export { activeIndex, activeOption, maxSelect, options, selected, value }
</script>

<MultiSelect
  {maxSelect}
  bind:activeIndex
  bind:activeOption
  bind:options
  bind:selected
  bind:value
  {...restProps}
/>
