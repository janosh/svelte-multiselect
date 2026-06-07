<script lang="ts">
  import cmd_palette_src from '$lib/CmdPalette.svelte?raw'
  import { FileDetails } from '$lib'
</script>

## Nav Palette

You can use `<MultiSelect />` to build a navigation palette in just 70 lines of code (50 without styles).

```svelte example id="disabled-input-title"
<script lang="ts">
  import { goto } from '$app/navigation'
  import { CmdPalette } from '$lib'
  import { routes } from '../index'

  interface Action {
    label: string
    action: () => Promise<void>
  }

  const actions: Action[] = routes.map(({ route }) => ({
    label: route,
    action: () => goto(route),
  }))
</script>

<CmdPalette {actions} />
```

## Shortcuts, Descriptions & Recent Actions

Actions can carry a `shortcut` (rendered as <kbd>⌘</kbd>-style key hints and triggered globally while the palette is closed unless `global_shortcuts={false}`) and a `description` shown below the label. Pass `recent_actions_key` to persist triggered actions to `localStorage` and rank them first when the palette reopens.

```svelte example id="cmd-palette-shortcuts"
<script lang="ts">
  import { CmdPalette } from '$lib'

  let last_triggered = $state(``)

  const actions = [
    {
      label: `Toggle theme`,
      description: `Switch between light and dark mode`,
      shortcut: `ctrl+shift+l`,
      action: (label: string) => (last_triggered = label),
    },
    {
      label: `Copy page URL`,
      description: `Copy the current address to the clipboard`,
      shortcut: `ctrl+shift+u`,
      action: (label: string) => (last_triggered = label),
    },
    { label: `Open settings`, action: (label: string) => (last_triggered = label) },
  ]
</script>

<CmdPalette
  {actions}
  triggers={[`p`]}
  recent_actions_key="demo-recent-actions"
  placeholder="Recently used actions float to the top..."
/>
<p>
  Open with <kbd>cmd/ctrl+p</kbd> or press <kbd>ctrl+shift+l</kbd> /
  <kbd>ctrl+shift+u</kbd> anywhere on this page. Last triggered:
  <strong>{last_triggered || `none`}</strong>
</p>
```

<FileDetails files={[{ title: `<code>CmdPalette.svelte</code> source code`, content: cmd_palette_src }]} />
