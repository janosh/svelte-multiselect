<script lang="ts">
  import { FileDetails } from 'svelte-zoo'
</script>

## Snippets

### Svelte SVG component as `"removeIcon"` snippet

```svelte example stackblitz id="languages-1"
<script>
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet, MinusIcon } from '$site'
  import { Icon } from 'svelte-zoo'
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

<FileDetails paths={[`./LanguageSnippet.svelte`, `./MinusIcon.svelte`]} />

### Simple HTML tag as `"removeIcon"` snippet

```svelte example stackblitz id="languages-2"
<script>
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'
  import { Icon } from 'svelte-zoo'

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

```svelte example stackblitz id="languages-2"
<script>
  import MultiSelect from '$lib'
  import { languages } from '$site/options'
  import { LanguageSnippet } from '$site'
  import { Icon } from 'svelte-zoo'

  let selected = $state([`Python`, `TypeScript`, `Julia`])
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
