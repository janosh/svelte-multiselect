## Duplicates MultiSelect

```svelte example id="disabled-input-title"
<script lang="ts">
  import MultiSelect from '$lib'
  import type { ObjectOption } from '$lib/types'

  interface IdOption extends ObjectOption {
    id: number
  }

  let duplicates = $state(true)
  const options: IdOption[] = [
    { label: 'Duplicate label', id: 1 },
    { label: 'Duplicate label', id: 1 },
    { label: 'Duplicate label', id: 2 },
  ]
  let selected: IdOption[] = $state([options[0]])
  let key: string = $state(`JSON.stringify`)
</script>

Allow duplicates: <input type="checkbox" bind:checked={duplicates} />

<label for="key">Key
  <input bind:group={key} type="radio" name="key" value="JSON.stringify" /> JSON.stringify
  <input bind:group={key} type="radio" name="key" value="==="> ===
</label>

<MultiSelect
  id="duplicates"
  {options}
  bind:selected
  {duplicates}
  key={key === 'JSON.stringify' ? JSON.stringify : (option) => option}
/>

<pre>{JSON.stringify(selected)}</pre>
```

The mouse tooltip will show `disabledInputTitle` when hovering the component.
