<script lang="ts">
  import { FileDetails } from '$lib'
  import language_snippet_src from '$site/LanguageSnippet.svelte?raw'
  import minus_icon_src from '$site/MinusIcon.svelte?raw'
</script>

## Snippets

### Svelte SVG component as `"removeIcon"` snippet

```svelte example id="languages-1"
<script lang="ts">
  import MultiSelect, { Icon } from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet, MinusIcon } from '$site'
</script>

<MultiSelect
  options={languages}
  maxSelect={5}
  placeholder="What languages do you know?"
  selected={['Python', 'TypeScript', 'Julia']}
>
  {#snippet children({ option })}
    <LanguageSnippet {option} />
  {/snippet}
  {#snippet expandIcon({ open })}
    <Icon icon={open ? 'Collapse' : 'Expand'} />
  {/snippet}
  {#snippet removeIcon()}
    <MinusIcon width="1em" />
  {/snippet}
</MultiSelect>
```

<FileDetails files={[
{ title: `<code>LanguageSnippet.svelte</code>`, content: language_snippet_src },
{ title: `<code>MinusIcon.svelte</code>`, content: minus_icon_src },
]} />

### Simple HTML tag as `"removeIcon"` snippet

```svelte example id="languages-2"
<script lang="ts">
  import MultiSelect, { Icon } from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'

  // local variable used in CollapseIcon onclick callback to close dropdown
  let open = $state(false)
</script>

<MultiSelect
  options={languages}
  maxSelect={5}
  placeholder="What languages do you know?"
  selected={[`Python`, `TypeScript`, `Julia`]}
  bind:open
>
  {#snippet selectedItem({ option })}
    <LanguageSnippet {option} />
  {/snippet}
  {#snippet option({ option })}
    <LanguageSnippet {option} />
  {/snippet}
  {#snippet expandIcon({ open: expandOpen })}
    <button
      onclick={() => (open = false)}
      onkeyup={(event) => {
        event.preventDefault()
        if ([`Enter`, `Space`].includes(event.code)) open = !open
      }}
    >
      <Icon icon={expandOpen ? `Collapse` : `Expand`} />
    </button>
  {/snippet}
  {#snippet removeIcon()}
    <span style="width: 2ex">x</span>
  {/snippet}
</MultiSelect>
```

### `"user-msg"` snippet

```svelte example id="languages-2"
<script lang="ts">
  import MultiSelect, { Icon } from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'

  let selected: string[] = $state([`Python`, `TypeScript`, `Julia`])
  let searchText = $state(`Julia`)
</script>

<MultiSelect
  options={languages}
  bind:searchText
  bind:selected
  maxSelect={5}
  placeholder="What languages do you know?"
  open
  allowUserOptions
>
  {#snippet userMsg({ msg })}
    <span>{msg} {selected?.includes(searchText) ? '🤦' : '👷'}</span>
  {/snippet}
</MultiSelect>
```
