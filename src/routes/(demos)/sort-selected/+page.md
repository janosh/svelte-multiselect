<script lang="ts">
  import { FileDetails } from '$lib'
  import options_src from '$site/options.ts?raw'
</script>

## Sorting Selected Items

### Frontend Lib Picker (default sorting)

```svelte example id="default-sort"
<script>
  import MultiSelect from '$lib'
  import { frontend_libs } from '$site/options'

  let selected = $state([])
</script>

selected = {selected.map((itm, idx) => `${idx + 1}. ${itm.label}`).join(`, `) || `[]`}

<MultiSelect
  options={frontend_libs}
  placeholder="Pick your favorite frontend libs"
  sortSelected
  bind:selected
/>
```

<br />

### Frontend Lib Picker (custom sorting by programming language)

```svelte example id="custom-sort"
<script lang="ts">
  import MultiSelect, { type Option } from '$lib'
  import { frontend_libs } from '$site/options'

  const sortSelected = (op1: Option, op2: Option) => {
    if (op1.lang !== op2.lang) return op1.lang.localeCompare(op2.lang)
    return op1.label.localeCompare(op2.label)
  }
</script>

<MultiSelect
  options={frontend_libs}
  placeholder="Pick your favorite frontend libs"
  {sortSelected}
/>
```

<FileDetails files={[{ title: `<code>options.ts</code>`, content: options_src }]} />

<br />

MultiSelect by default simply renders selected items in the order they were chosen. Unless `draggable=false`, users can drag and drop to reorder selected options. The prop

```ts
sortSelected: boolean | ((op1: Option, op2: Option) => number) = false
```

can be set to `true` to instead use default JS array sorting (uses option labels as sorting key if options are objects). Provide your own compare function to define custom sort order of selected options.
