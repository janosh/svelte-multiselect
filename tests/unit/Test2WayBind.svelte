<script lang="ts">
  import MultiSelect, { type Option } from '$lib'
  import { createEventDispatcher } from 'svelte'

  export let selected: Option[] = []
  export let options: Option[] = [1, 2, 3]
  export let value: Option | Option[] | null = null
  export let maxSelect: number | null = null

  const dispatch = createEventDispatcher()

  $: dispatch(`options-changed`, options)
  $: dispatch(`selected-changed`, selected)
  $: dispatch(`value-changed`, value)
</script>

<MultiSelect bind:options bind:selected bind:value {maxSelect} />
