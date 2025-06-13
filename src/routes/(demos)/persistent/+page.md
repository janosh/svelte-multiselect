## Page-Reload Persistent MultiSelect

This example shows how to combine MultiSelect with `sessionStorage` to persist the `selected` state across page reloads.

<br />

```svelte example stackblitz id="languages"
<script>
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'
  import { onMount } from 'svelte'

  let selected = $state([])

  onMount(() => {
    const stored = sessionStorage[`languages`]
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
