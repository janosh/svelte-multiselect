<script lang="ts">
  import MultiSelect from '$lib'
  import { foods, languages } from '$site/options'
  import { LanguageSnippet } from '$site'
</script>

## Allow Custom User Input

`allowUserOptions={true}` means users can enter custom options by entering text and hitting enter.

```svelte example id="foods"
<script lang="ts">
  import MultiSelect, { Toggle } from '$lib'
  import { foods } from '$site/options'

  let selected: string[] = $state(
    '🍇 Grapes, 🍈 Melon, 🍉 Watermelon, 🍊 Tangerine'.split(', '),
  )
  let duplicates = $state(false)
  let last_created: string | null = $state(null)
</script>

<MultiSelect
  options={foods}
  allowUserOptions
  {duplicates}
  bind:selected
  createOptionMsg={({ searchText }) => `Add '${searchText}' as custom food`}
  oncreate={({ option }) => last_created = String(option)}
/>

{#if last_created}
  <p style="color: mediumseagreen; margin-top: 0.5em">
    ✓ Created custom option: {last_created}
  </p>
{/if}

<label for="duplicates" style="display: block; margin-top: 1em">
  Allow duplicates
  <Toggle bind:checked={duplicates} id="duplicates" />
</label>

<p style="margin-top: 0.5em">
  Selected ({selected.length}): {selected.join(', ') || 'none'}
</p>
```

## Append User Input

`allowUserOptions="append"` is similar to `true` but also adds user-entered custom options to the dropdown list. They'll remain there for re-selection if users remove their custom options from selected items.

```svelte example id="languages"
<script lang="ts">
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'

  let selected_append: string[] = $state(['Haskell', 'TypeScript'])
</script>

<MultiSelect
  options={languages}
  allowUserOptions="append"
  bind:selected={selected_append}
  createOptionMsg={({ searchText, options }) =>
  `Add '${searchText}' (${options.length} languages available)`}
>
  {#snippet children({ option })}
    <LanguageSnippet {option} />
  {/snippet}
</MultiSelect>

<p style="margin-top: 0.5em">Selected: {selected_append.join(', ')}</p>
```

## Start empty

You can start with no options and let users populate MultiSelect from scratch. In this case, MultiSelect acts more like a tagging component.

```svelte example id="no-default-options"
<script lang="ts">
  import MultiSelect from '$lib'

  let selected: string[] = $state([])
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
