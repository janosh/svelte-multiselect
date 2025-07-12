<script>
  import cmd_palette_src from '$lib/CmdPalette.svelte?raw'
  import { FileDetails } from '$lib'
</script>

## Nav Palette

You can use `<MultiSelect />` to build a navigation palette in just 70 lines of code (50 without styles).

```svelte example id="disabled-input-title"
<script>
  import { goto } from '$app/navigation'
  import { CmdPalette } from '$lib'
  import { routes } from '../index'

  const actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(route),
  }))
</script>

<CmdPalette {actions} />
```

<FileDetails files={[{ title: `<code>CmdPalette.svelte</code> source code`, content: cmd_palette_src }]} />
