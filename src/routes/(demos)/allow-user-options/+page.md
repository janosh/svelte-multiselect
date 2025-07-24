<script lang="ts">
  import MultiSelect from '$lib'
  import { foods, languages } from '$site/options'
  import { LanguageSnippet } from '$site'
</script>

## Allow Custom User Input

`allowUserOptions={true}` means users can enter custom options by entering text and hitting enter.

```svelte example id="foods"
<script>
  import MultiSelect, { Toggle } from '$lib'
  import { foods } from '$site/options'

  let selected = $state(
    '🍇 Grapes, 🍈 Melon, 🍉 Watermelon, 🍊 Tangerine'.split(', '),
  )
  let duplicates = $state(false)
</script>

<MultiSelect
  options={foods}
  allowUserOptions
  {duplicates}
  bind:selected
/>

<label for="duplicates" style="display: block; margin-top: 1em">
  Allow duplicates
  <Toggle bind:checked={duplicates} id="duplicates" />
</label>
```

<br />

## Append User Input

`allowUserOptions="append"` is similar to `true` but also adds user-entered custom options to the dropdown list. They'll remain there for re-selection if users remove their custom options from selected items.

```svelte example id="languages"
<script>
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'

  let selected_append = $state(['Haskell', 'TypeScript'])
</script>

<MultiSelect
  options={languages}
  allowUserOptions="append"
  bind:selected={selected_append}
  createOptionMsg="True polyglots can enter custom languages!"
>
  {#snippet children({ option })}
    <LanguageSnippet {option} />
  {/snippet}
</MultiSelect>
```

<br />

## Start empty

You can start with no options and let users populate MultiSelect from scratch. In this case, MultiSelect acts more like a tagging component.

```svelte example id="no-default-options"
<script>
  import MultiSelect from '$lib'

  let selected = $state([])
</script>

{#if selected?.length > 0}
  <pre><code>selected = {JSON.stringify(selected)}</code></pre>
{/if}

<MultiSelect
  allowUserOptions="append"
  bind:selected
  noMatchingOptionsMsg=""
  createOptionMsg={null}
/>
```
