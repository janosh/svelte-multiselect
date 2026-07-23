<script lang="ts">
  import cmd_palette_src from '$lib/CmdPalette.svelte?raw'
  import pagefind_palette_src from '$lib/PagefindPalette.svelte?raw'
  import { FileDetails } from '$lib'
</script>

## Nav Palette

You can use `<MultiSelect />` to build a navigation palette in just 70 lines of code (50 without styles).

```svelte example id="disabled-input-title"
<script lang="ts">
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { CmdPalette } from '$lib'
  import { routes } from '../../index'

  interface Action {
    label: string
    action: () => Promise<void>
  }

  const actions: Action[] = routes.map(({ route }) => ({
    label: route,
    action: () => goto(`${base}${route}`),
  }))
</script>

<CmdPalette {actions} triggers={[`n`]} />
```

## Site Search with Pagefind

`PagefindPalette` wraps `CmdPalette` with full-text search over statically generated pages.
Install `pagefind` as a development dependency, then index the rendered site after the
application build. Run this script before previewing or deploying; when the index is absent,
the palette filters `fallback_actions`:

```json
{
  "scripts": {
    "build:site": "vite build && pagefind --site build"
  }
}
```

```svelte example id="pagefind-palette"
<script lang="ts">
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { PagefindPalette } from '$lib'
  import { routes } from '../../index'

  const fallback_actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(`${base}${route}`),
  }))
</script>

<PagefindPalette
  {fallback_actions}
  navigate={goto}
  strip_html_suffix
  pagefind_path={`${base}/pagefind/pagefind.js`}
  triggers={[`j`]}
  aria_label="Search documentation"
/>

<p>Open the documentation search with <kbd>cmd/ctrl+j</kbd>.</p>
```

## Shortcuts, Descriptions & Recent Actions

Actions can carry a `description`, `metadata`, `badge`, `keywords`, `shortcut`, and
`disabled` state. The default filter searches all visible fields plus `keywords` and
supports multiple terms. Shortcuts render as <kbd>⌘</kbd>-style key hints and trigger
globally while the palette is closed unless `global_shortcuts={false}`. Pass
`recent_actions_key` to persist triggered actions to `localStorage` and rank them first
when the palette reopens.

```svelte example id="cmd-palette-shortcuts"
<script lang="ts">
  import { CmdPalette } from '$lib'

  let last_triggered = $state(``)

  const actions = [
    {
      label: `Toggle theme`,
      description: `Switch between light and dark mode`,
      metadata: [`Appearance`],
      badge: `Setting`,
      keywords: [`color scheme`],
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

<FileDetails files={[
{ title: `<code>CmdPalette.svelte</code> source code`, content: cmd_palette_src },
{ title: `<code>PagefindPalette.svelte</code> source code`, content: pagefind_palette_src },
]} />
