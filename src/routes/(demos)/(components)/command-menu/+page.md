<script lang="ts">
  import command_menu_src from '$lib/CommandMenu.svelte?raw'
  import page_search_src from '$lib/PageSearch.svelte?raw'
  import { FileDetails } from '$lib'
</script>

## Navigation Command Menu

`<MultiSelect />` can implement a navigation command menu in 70 lines of code (50 without styles).

```svelte example id="disabled-input-title"
<script lang="ts">
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { CommandMenu } from '$lib'
  import { routes } from '../../index'

  const actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(`${base}${route}`),
  }))
</script>

<CommandMenu {actions} triggers={[`n`]} />
```

## Site Search with Pagefind

`PageSearch` wraps `CommandMenu` with full-text search over statically generated pages.
Install `pagefind` as a development dependency, then index the rendered site after the
application build. Run this script before previewing or deploying; when the index is absent,
the search filters `fallback_actions`:

```json
{
  "scripts": {
    "build:site": "vite build && pagefind --site build"
  }
}
```

```svelte example id="page-search"
<script lang="ts">
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { PageSearch } from '$lib'
  import { routes } from '../../index'

  const fallback_actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(`${base}${route}`),
  }))
</script>

<PageSearch
  {fallback_actions}
  navigate={goto}
  strip_html_suffix
  pagefind_path={`${base}/pagefind/pagefind.js`}
  triggers={[`j`]}
  aria_label="Search documentation"
/>

<p>Open the documentation search with <kbd>cmd/ctrl+j</kbd>.</p>
```

The `navigate` callback receives the selected result's `query`, `label`, and `description`
as its second argument. A persistent layout can carry the query across client-side
navigation and apply `highlight_matches` to the destination content:

```svelte
<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation'
  import { highlight_matches } from 'svelte-multiselect/attachments'
  import type { PageSearchNavigateDetails } from 'svelte-multiselect/types'

  let highlight_query = $state(``)

  const navigate = async (url: string, { query }: PageSearchNavigateDetails) => {
    await goto(url)
    highlight_query = ``
    queueMicrotask(() => (highlight_query = query))
  }

  afterNavigate(() => (highlight_query = ``))
</script>

<main
  {@attach highlight_matches({
    query: highlight_query,
    css_class: `site-search-match`,
    duration_ms: 8000,
  })}
>
  ...
</main>

<style>
  :global(::highlight(site-search-match)) {
    background: gold;
    color: inherit;
  }
</style>
```

See the [attachments demo](attachments) for `highlight_matches` options and effects.
Stemmed Pagefind results may have no exact substring.

## Shortcuts, Descriptions & Recent Actions

Actions can carry a `description`, `metadata`, `badge`, `keywords`, `shortcut`, and
`disabled` state. The default filter searches all visible fields plus `keywords` and
supports multiple terms. Shortcuts render as <kbd>⌘</kbd>-style key hints and trigger
globally while the menu is closed unless `global_shortcuts={false}`. Pass
`recent_actions_key` to persist triggered actions to `localStorage` and rank them first
when the menu reopens.

```svelte example id="command-menu-shortcuts"
<script lang="ts">
  import { CommandMenu } from '$lib'

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

<CommandMenu
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
{ title: `<code>CommandMenu.svelte</code> source code`, content: command_menu_src },
{ title: `<code>PageSearch.svelte</code> source code`, content: page_search_src },
]} />
