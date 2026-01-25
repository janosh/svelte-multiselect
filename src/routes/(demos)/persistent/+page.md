## Page-Reload Persistent MultiSelect

This example shows how to combine MultiSelect with `sessionStorage` to persist the `selected` state across page reloads.

```svelte example id="languages"
<script lang="ts">
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'
  import { onMount } from 'svelte'

  let selected: string[] = $state([])

  onMount(() => {
    const stored: string | null = sessionStorage.getItem(`languages`)
    selected = stored ? JSON.parse(stored) : `Python TypeScript C Haskell`.split(` `)
  })

  $effect(() => {
    if (sessionStorage) sessionStorage[`languages`] = JSON.stringify(selected)
  })
</script>

<MultiSelect
  options={languages}
  placeholder="What languages do you know?"
  bind:selected
>
  {#snippet selectedItem({ idx, option })}
    <LanguageSnippet {option} {idx} />
  {/snippet}
</MultiSelect>
```

## Array Cloning Infinite Loop Prevention (Issue #309)

Tests that binding to reactive wrappers (Svelte stores, Superforms, etc.) that clone arrays on assignment doesn't cause infinite loops. See [issue #309](https://github.com/janosh/svelte-multiselect/issues/309).

```svelte example id="store-binding"
<script lang="ts">
  import MultiSelect from '$lib'
  import { type Writable, writable } from 'svelte/store'

  // Regression test for issue #309: store subscriptions would cause infinite
  // loops without the values_equal() fix in MultiSelect.svelte
  const options: string[] = [`Red`, `Green`, `Blue`]
  let increment = $state(0)
  let list_store: Writable<string[]> = writable([])

  list_store.subscribe(() => increment++)
</script>

<MultiSelect {options} bind:selected={$list_store} placeholder="Select colors..." />
<p id="store-binding-status">
  Modified: {increment} times
  {#if increment > 50}⚠️ Regression!{:else if increment > 1}✅ Fixed{/if}
</p>
```
