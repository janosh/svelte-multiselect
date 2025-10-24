## Duplicates MultiSelect

```svelte example id="disabled-input-title"
<script>
  import MultiSelect from '$lib'

  let duplicates = $state(true)
  const options = [
    { label: 'Duplicate label', id: 1 },
    { label: 'Duplicate label', id: 1 },
    { label: 'Duplicate label', id: 2 },
  ]
  let selected = $state([options[0]])
  let key = $state(`JSON.stringify`)
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
