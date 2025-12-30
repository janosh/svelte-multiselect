## Option Grouping

Group related options together with visual headers. Add a `group` key to option objects and they're automatically grouped with section headers.

This addresses [GitHub issue #135](https://github.com/janosh/svelte-multiselect/issues/135).

### Basic Grouping

```svelte example id="basic-grouping"
<script>
  import MultiSelect from '$lib'

  const options = [
    { label: `JavaScript`, group: `Frontend` },
    { label: `TypeScript`, group: `Frontend` },
    { label: `React`, group: `Frontend` },
    { label: `Python`, group: `Backend` },
    { label: `Go`, group: `Backend` },
    { label: `Rust`, group: `Backend` },
    { label: `PostgreSQL`, group: `Database` },
    { label: `MongoDB`, group: `Database` },
  ]

  let selected = $state([])
  let searchMatchesGroups = $state(false)
</script>

<label>
  <input type="checkbox" bind:checked={searchMatchesGroups} />
  <code>searchMatchesGroups</code> — Type "Backend" to match all backend options
</label>

<MultiSelect
  {options}
  bind:selected
  {searchMatchesGroups}
  placeholder="Select technologies..."
/>

<p>Selected: {selected.map((opt) => opt.label).join(`, `) || `none`}</p>
```

> **Note:** Search filtering works automatically—empty groups are hidden when no options match.

### Collapsible Groups

Enable `collapsibleGroups` to let users collapse/expand groups. Use `searchExpandsCollapsedGroups` or `keyboardExpandsCollapsedGroups` for auto-expansion:

```svelte example id="collapsible-groups"
<script>
  import MultiSelect from '$lib'

  const options = [
    { label: `🍎 Apple`, group: `Fruits` },
    { label: `🍊 Orange`, group: `Fruits` },
    { label: `🍌 Banana`, group: `Fruits` },
    { label: `🥕 Carrot`, group: `Vegetables` },
    { label: `🥦 Broccoli`, group: `Vegetables` },
    { label: `🌽 Corn`, group: `Vegetables` },
    { label: `🥛 Milk`, group: `Dairy` },
    { label: `🧀 Cheese`, group: `Dairy` },
  ]

  let selected = $state([])
  let collapsedGroups = $state(new Set([`Dairy`])) // Dairy starts collapsed
  let searchExpandsCollapsedGroups = $state(true)
  let keyboardExpandsCollapsedGroups = $state(true)
  let collapseAllGroups = $state()
  let expandAllGroups = $state()
</script>

<div style="display: flex; flex-wrap: wrap; gap: 1em; margin-bottom: 0.5em">
  <label>
    <input type="checkbox" bind:checked={searchExpandsCollapsedGroups} />
    <code>searchExpandsCollapsedGroups</code>
  </label>
  <label>
    <input type="checkbox" bind:checked={keyboardExpandsCollapsedGroups} />
    <code>keyboardExpandsCollapsedGroups</code>
  </label>
</div>

<div style="display: flex; gap: 1em; margin-bottom: 1em">
  <button onclick={() => collapseAllGroups?.()}>Collapse All</button>
  <button onclick={() => expandAllGroups?.()}>Expand All</button>
</div>

<MultiSelect
  {options}
  bind:selected
  collapsibleGroups
  bind:collapsedGroups
  {searchExpandsCollapsedGroups}
  {keyboardExpandsCollapsedGroups}
  bind:collapseAllGroups
  bind:expandAllGroups
  placeholder="Click headers or use arrow keys..."
/>

<p>Collapsed: {[...collapsedGroups].join(`, `) || `none`}</p>
```

### Per-Group Select All

Enable `groupSelectAll` to add a toggle button to each group header:

```svelte example id="group-select-all"
<script>
  import MultiSelect from '$lib'

  const options = [
    { label: `Red`, group: `Primary` },
    { label: `Blue`, group: `Primary` },
    { label: `Yellow`, group: `Primary` },
    { label: `Orange`, group: `Secondary` },
    { label: `Green`, group: `Secondary` },
    { label: `Purple`, group: `Secondary` },
  ]

  let selected = $state([])
</script>

<MultiSelect
  {options}
  bind:selected
  groupSelectAll
  keepSelectedInDropdown="checkboxes"
  placeholder="Select colors..."
/>

<p>Selected: {selected.map((opt) => opt.label).join(`, `) || `none`}</p>
```

### Ungrouped Options & Sorting

Use `ungroupedPosition` for options without a `group` key, and `groupSortOrder` to sort groups:

```svelte example id="ungrouped-sorting"
<script>
  import MultiSelect from '$lib'

  const options = [
    { label: `Featured Item` }, // No group
    { label: `Popular Choice` }, // No group
    { label: `Zebra`, group: `Z Animals` },
    { label: `Apple`, group: `A Fruits` },
    { label: `Lion`, group: `L Animals` },
  ]

  let selected = $state([])
  let ungroupedPosition = $state(`first`)
  let groupSortOrder = $state(`asc`)
</script>

<div style="display: flex; gap: 2em; margin-bottom: 1em">
  <label>
    ungroupedPosition:
    <select bind:value={ungroupedPosition}>
      <option value="first">first</option>
      <option value="last">last</option>
    </select>
  </label>
  <label>
    groupSortOrder:
    <select bind:value={groupSortOrder}>
      <option value="none">none</option>
      <option value="asc">asc</option>
      <option value="desc">desc</option>
    </select>
  </label>
</div>

<MultiSelect {options} bind:selected {ungroupedPosition} {groupSortOrder} />
```

### Sticky Headers & Dynamic Loading

Use `stickyGroupHeaders` for long lists. Grouping also works with `loadOptions`:

```svelte example id="sticky-dynamic"
<script>
  import MultiSelect from '$lib'

  const departments = [`Engineering`, `Design`, `Marketing`, `Sales`, `HR`]
  const server_data = departments.flatMap((dept) =>
    Array.from({ length: 6 }, (_, idx) => ({
      label: `${dept.slice(0, 3)}-${idx + 1}`,
      name: `Team Member ${idx + 1}`,
      group: dept,
    }))
  )

  async function load_options({ search, offset, limit }) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const filtered = search
      ? server_data.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.group.toLowerCase().includes(search.toLowerCase())
      )
      : server_data
    return {
      options: filtered.slice(offset, offset + limit),
      hasMore: offset + limit < filtered.length,
    }
  }

  let selected = $state([])
  let stickyGroupHeaders = $state(true)
</script>

<label style="margin-bottom: 1em; display: block">
  <input type="checkbox" bind:checked={stickyGroupHeaders} />
  <code>stickyGroupHeaders</code>
</label>

<MultiSelect
  loadOptions={load_options}
  bind:selected
  {stickyGroupHeaders}
  collapsibleGroups
  groupSelectAll
  placeholder="Scroll to see sticky headers..."
/>
```

### Custom Group Header

Use the `groupHeader` snippet for complete control over header rendering:

```svelte example id="custom-group-header"
<script>
  import MultiSelect from '$lib'

  const options = [
    { label: `New York`, group: `USA` },
    { label: `Los Angeles`, group: `USA` },
    { label: `London`, group: `UK` },
    { label: `Tokyo`, group: `Japan` },
    { label: `Paris`, group: `France` },
  ]

  const emojis = { USA: `🇺🇸`, UK: `🇬🇧`, Japan: `🇯🇵`, France: `🇫🇷` }
  let selected = $state([])
</script>

<MultiSelect
  {options}
  bind:selected
  collapsibleGroups
  groupSelectAll
  placeholder="Select cities..."
>
  {#snippet groupHeader({ group, options, collapsed })}
    <span style="display: flex; align-items: center; gap: 8px; width: 100%">
      <span style="font-size: 1.2em">{emojis[group]}</span>
      <strong>{group}</strong>
      <span style="opacity: 0.6; font-size: 0.85em">({options.length})</span>
      <span style="margin-left: auto">{collapsed ? `▶` : `▼`}</span>
    </span>
  {/snippet}
</MultiSelect>
```

## Props Reference

| Prop                             | Type                              | Default   | Description                              |
| -------------------------------- | --------------------------------- | --------- | ---------------------------------------- |
| `collapsibleGroups`              | `boolean`                         | `false`   | Enable click-to-collapse groups          |
| `collapsedGroups`                | `Set<string>`                     | `new Set` | Bindable set of collapsed group names    |
| `groupSelectAll`                 | `boolean`                         | `false`   | Add select/deselect all button per group |
| `ungroupedPosition`              | `'first' \| 'last'`               | `'first'` | Where to render ungrouped options        |
| `groupSortOrder`                 | `'none' \| 'asc' \| 'desc' \| fn` | `'none'`  | Sort groups alphabetically or custom     |
| `searchExpandsCollapsedGroups`   | `boolean`                         | `false`   | Auto-expand when search matches          |
| `searchMatchesGroups`            | `boolean`                         | `false`   | Include group name in search matching    |
| `keyboardExpandsCollapsedGroups` | `boolean`                         | `false`   | Auto-expand on arrow key navigation      |
| `stickyGroupHeaders`             | `boolean`                         | `false`   | Keep headers visible when scrolling      |
| `liGroupHeaderClass`             | `string`                          | `''`      | CSS class for group header `<li>`        |
| `liGroupHeaderStyle`             | `string \| null`                  | `null`    | Inline style for group headers           |
| `groupHeader`                    | `Snippet`                         | —         | Custom group header rendering            |
| `collapseAllGroups`              | `() => void`                      | —         | Bindable function to collapse all        |
| `expandAllGroups`                | `() => void`                      | —         | Bindable function to expand all          |
| `ongroupToggle`                  | `fn`                              | —         | Callback when group toggled              |

### CSS Variables

| Variable                         | Default                  | Description      |
| -------------------------------- | ------------------------ | ---------------- |
| `--sms-group-header-font-weight` | `600`                    | Font weight      |
| `--sms-group-header-font-size`   | `0.85em`                 | Font size        |
| `--sms-group-header-color`       | `light-dark(#666, #aaa)` | Text color       |
| `--sms-group-header-bg`          | `transparent`            | Background       |
| `--sms-group-header-padding`     | `6pt 1ex 3pt`            | Padding          |
| `--sms-group-header-hover-bg`    | `light-dark(...)`        | Hover background |
| `--sms-group-item-padding-left`  | `1.5ex`                  | Option indent    |
