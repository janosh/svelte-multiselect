## Duplicates MultiSelect

<label for="disabled">Favorite frontend tool?</label>

```svelte example stackblitz id="disabled-input-title"
<script>
  import MultiSelect from 'svelte-multiselect'
  import { Toggle } from 'svelte-zoo'

  let duplicates = true
  const options = [
    { label: 'Duplicate label', id: 1 },
    { label: 'Duplicate label', id: 2 },
  ]
  let selected = [options[0]]
</script>

<MultiSelect
  id="duplicates"
  {options}
  bind:selected
  {duplicates}
  key={JSON.stringify}
/>
<Toggle bind:checked={duplicates} />

<pre>{JSON.stringify(selected)}</pre>
```

The mouse tooltip will show `disabledInputTitle` when hovering the component.
