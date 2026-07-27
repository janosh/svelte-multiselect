## ButtonGroup

The n-way sibling of [`Toggle`](extras#toggle): a row of buttons over a fixed set of
options, either as a segmented control (pick one) or a filter row (pick any).

Options come in whichever shape you already have them in — bare values, a
`Record<value, label>`, `[value, label]` pairs, or objects carrying a `tooltip`,
`icon`, `disabled` or `loading` flag.

### Single select

`multiple` defaults to `false`, so the group is a `radiogroup` of `role="radio"`
buttons: one tab stop for the whole group, arrow keys walk it (wrapping at both ends,
skipping disabled options) and carry the selection with focus, Home and End jump to
either end.

`sort_order` is opt-in — leave it `null` (the default) and no arrow renders.

```svelte example id="button-group-single"
<script lang="ts">
  import ButtonGroup, { type ButtonGroupOption } from '$lib/ButtonGroup.svelte'

  const options: ButtonGroupOption[] = [
    {
      value: `commits`,
      label: `commits`,
      tooltip: `Total commits to the default branch`,
    },
    { value: `stars`, label: `stars`, icon: `GitHub` },
    { value: `title`, label: `title` },
    { value: `size`, label: `size`, disabled: true },
  ]
  let sort_by = $state(`commits`)
  let sort_order = $state<`asc` | `desc`>(`desc`)
</script>

<ButtonGroup
  {options}
  bind:selected={sort_by}
  bind:sort_order
  label="Sort projects by"
  style="--btn-group-gap: 6pt"
/>

<p>
  sorting by <code>{sort_by}</code> in <code>{sort_order}</code>ending order
</p>
```

### Multi select

`multiple` swaps the semantics rather than just the bookkeeping: the container becomes
a plain `group` of independent toggle buttons carrying `aria-pressed`, each its own tab
stop, since there is nothing mutually exclusive left for a radio group to announce.
`selected` is an array here.

The `option` snippet replaces a button's contents, `on_change` fires with the new
selection, and every colour is a `--btn-group-*` custom property.

```svelte example id="button-group-multi"
<script lang="ts">
  import ButtonGroup from '$lib/ButtonGroup.svelte'

  const tags: Record<string, string> = {
    svelte: `Svelte`,
    kit: `SvelteKit`,
    ts: `TypeScript`,
    css: `CSS`,
  }
  let active = $state([`svelte`])
</script>

<ButtonGroup
  options={tags}
  multiple
  bind:selected={active}
  label="Filter by tag"
  style="--btn-group-btn-radius: 1em; --btn-group-btn-active-bg: cornflowerblue; --btn-group-btn-active-color: white"
>
  {#snippet option({ option: opt, selected })}
    {opt.label}
    <span style="opacity: 0.6">{selected ? `×` : `+`}</span>
  {/snippet}
</ButtonGroup>

<p>filters: {active.length ? active.join(`, `) : `none`}</p>
```

### Styling

Everything themable hangs off `--btn-group-*`: `gap`, `padding`, `bg`, `border`,
`radius` on the container, and `btn-padding`, `btn-radius`, `btn-bg`, `btn-color`,
`btn-hover-bg`, `btn-active-bg`, `btn-active-color`, `btn-active-border-color`,
`btn-disabled-opacity`, `btn-font-family`, `btn-font-size` on the buttons. The component
lays its buttons out in a wrapping flex row and takes no position of its own, so placing
it is the call site's job.

Font weight and style are deliberately not set, so your own `button {}` rule still wins.
Only family and size are inherited, since a button's user-agent font would otherwise look
wrong inside body text.

The root is a `<div>`. Pass `as="span"` where a div would be invalid, such as inside a
heading or a paragraph.

Per-option tooltips come from each option's `tooltip` field. `tooltip_options` forwards
everything else to the [`tooltip`](/attachments#tooltip) attachment, so
`tooltip_options={{ allow_html: true }}` renders rich content instead of escaping it.
