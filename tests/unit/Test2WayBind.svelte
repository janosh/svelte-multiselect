<svelte:options accessors />

<script lang="ts">
  import MultiSelect, { type Option } from '$lib'
  import { createEventDispatcher } from 'svelte'

  export let activeIndex: number | null = null
  export let activeOption: Option | null = null
  export let maxSelect: number | null = null
  export let options: Option[]
  export let selected: Option[] = []
  export let value: Option | Option[] | null = null

  const dispatch = createEventDispatcher()

  $: dispatch(`activeIndex-changed`, activeIndex)
  $: dispatch(`activeOption-changed`, activeOption)
  $: dispatch(`options-changed`, options)
  $: dispatch(`selected-changed`, selected)
  $: dispatch(`value-changed`, value)
</script>

<MultiSelect
  {maxSelect}
  bind:activeIndex
  bind:activeOption
  bind:options
  bind:selected
  bind:value
  {...$$props}
/>
