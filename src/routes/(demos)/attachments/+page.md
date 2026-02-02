## Attachments

Exported from `svelte-multiselect/attachments`:

- [`tooltip`](#tooltip)
- [`draggable`](#draggable)
- [`sortable`](#sortable)
- [`highlight_matches`](#highlight_matches)
- [`click_outside`](#click_outside)

### `tooltip`

```svelte example id="attachments-tooltip"
<script lang="ts">
  import { tooltip } from '$lib'

  let custom_delay = $state(0)
</script>

<div style="display: flex; gap: 3em">
  <button
    aria-label="More info"
    style="padding: 0.4em 0.8em"
    {@attach tooltip({
      content: `<strong>Custom</strong> <em>HTML</em> tooltip`,
      placement: `right`,
      delay: custom_delay,
    })}
  >
    Hover me
  </button>

  <label style="display: inline-flex; gap: 0.5em; align-items: center">
    Delay (ms)
    <input type="number" min="0" step="50" bind:value={custom_delay} style="width: 6em" />
  </label>
</div>

<!-- Placement showcase -->
<div style="display: flex; gap: 1em; margin: 2em 0">
  <button {@attach tooltip({ content: `Top`, placement: `top` })}>
    Top
  </button>
  <button {@attach tooltip({ content: `Right`, placement: `right` })}>
    Right
  </button>
  <button {@attach tooltip({ content: `Bottom (default)`, placement: `bottom` })}>
    Bottom
  </button>
  <button {@attach tooltip({ content: `Left`, placement: `left` })}>
    Left
  </button>
</div>

<!-- Style variations via CSS variables to demonstrate customization -->
<div
  style="display: flex; gap: 1em; margin: 2em 0"
>
  <button
    style="--tooltip-bg: white; --text-color: #111; --tooltip-border: 1px solid rgba(0, 0, 0, 0.18); --tooltip-font-size: 12px; --tooltip-arrow-size: 5; --tooltip-opacity: 0.95"
    {@attach tooltip({ content: `Light tooltip`, placement: `top` })}
  >
    Light style
  </button>
  <button
    style="--tooltip-bg: #0f2a43; --text-color: #d7ecff; --tooltip-border: 1px solid rgba(0, 128, 255, 0.4); --tooltip-shadow: drop-shadow(0 4px 12px rgba(0, 128, 255, 0.25)); --tooltip-font-size: 14px; --tooltip-arrow-size: 8; --tooltip-opacity: 1"
    {@attach tooltip({ content: `Info tooltip`, placement: `right` })}
  >
    Info style
  </button>
  <button
    style="--tooltip-bg: rgba(255, 50, 50, 0.9); --text-color: white; --tooltip-border: 1px solid rgba(255, 50, 50, 0.9); --tooltip-radius: 3px; --tooltip-font-size: 12px; --tooltip-arrow-size: 10; --tooltip-opacity: 0.9"
    {@attach tooltip({ content: `Warning tooltip`, placement: `bottom` })}
  >
    Warning tooltip
  </button>
  <button
    style="--tooltip-bg: white; --text-color: #111; --tooltip-border: 1px solid rgba(255, 255, 255, 0.15); --tooltip-font-size: 16px; --tooltip-arrow-size: 12; --tooltip-padding: 10px 12px"
    {@attach tooltip({ content: `Large text + big arrow`, placement: `left` })}
  >
    Large text
  </button>
</div>

<!-- Note: Do not pass untrusted HTML/strings to `content` or `style`. Sanitize or use plain text. -->
<div style="display: flex; gap: 1em; margin: 2em 0">
  <button
    style="--tooltip-bg: #2d3748; --text-color: #e2e8f0; --tooltip-border: 2px solid #4299e1; --tooltip-arrow-size: 8"
    {@attach tooltip({
      content: `Custom style + border arrow`,
      placement: `top`,
      style:
        `box-shadow: 0 10px 25px rgba(66, 153, 225, 0.3); transform: scale(1.05);`,
    })}
  >
    Custom style
  </button>
  <button
    style="--tooltip-bg: #f56565; --text-color: white; --tooltip-border: 1px solid #c53030"
    {@attach tooltip({ content: `Disabled tooltip`, disabled: true })}
  >
    Disabled (no tooltip)
  </button>
  <button
    style="--tooltip-bg: #48bb78; --text-color: white; --tooltip-border: 3px solid #38a169; --tooltip-arrow-size: 12"
    {@attach tooltip({
      content: `Thick border with matching arrow`,
      placement: `bottom`,
      style: `font-weight: bold; letter-spacing: 0.5px;`,
    })}
  >
    Thick border
  </button>
</div>
<!-- Attach once to a container: children with title/aria-label/data-title get their own tooltip -->
<div style="display: flex; gap: 1em; margin: 2em 0" {@attach tooltip()}>
  <button title="Added via title attribute">Title-based</button>
  <button aria-label="Added via aria-label">aria-label</button>
  <button data-title="Added via data-title">data-title</button>
</div>

<!-- Text wrapping and shrink-to-fit width demo -->
<div style="display: flex; gap: 1em; margin: 2em 0; flex-wrap: wrap">
  <button
    style="--tooltip-max-width: 200px"
    {@attach tooltip({
      content: `This tooltip uses balanced text wrapping for even line lengths`,
      placement: `top`,
    })}
  >
    Balanced wrapping
  </button>
  <button
    style="--tooltip-max-width: 220px"
    {@attach tooltip({
      content:
        `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
      placement: `bottom`,
    })}
  >
    Long text shrink-to-fit
  </button>
</div>

<!-- Long word shrink-to-fit demo: tooltip contracts when long words cause early wrapping -->
<div style="display: flex; gap: 1em; margin: 2em 0; flex-wrap: wrap">
  <button
    {@attach tooltip({
      content: `Donaudampfschifffahrtsgesellschaftskapitän is a German compound word`,
      placement: `top`,
    })}
  >
    Long German word
  </button>
  <button
    {@attach tooltip({
      content: `pneumonoultramicroscopicsilicovolcanoconiosis is very long`,
      placement: `bottom`,
    })}
  >
    Medical term
  </button>
  <button
    {@attach tooltip({
      content: `supercalifragilisticexpialidocious sounds quite atrocious`,
      placement: `right`,
    })}
  >
    Mary Poppins
  </button>
  <button
    {@attach tooltip({ content: `antidisestablishmentarianism`, placement: `left` })}
  >
    Single long word
  </button>
</div>

<style>
  button {
    padding: 0.35em 0.7em;
  }
</style>
```

#### Reactive Tooltip Content

Tooltip content updates reactively via `MutationObserver` when `title`, `aria-label`, or `data-title` changes:

```svelte example id="attachments-tooltip-reactive"
<script lang="ts">
  import { tooltip } from '$lib'
  let text = $state(`Edit me!`)
</script>

<input bind:value={text} style="width: 16ch" />
<button title={text} {@attach tooltip({ placement: `right` })}>Hover me</button>
```

### `draggable`

```svelte example id="attachments-draggable"
<script lang="ts">
  import { draggable } from '$lib'

  let last_drag: string = $state('')
</script>

<div class="drag-area">
  <!-- Absolute positioned box → default handle is the node itself -->
  <div
    class="drag-box"
    style="position: absolute; left: 1rem; top: 1rem"
    {@attach draggable({
      on_drag: (event: PointerEvent) =>
        last_drag = `${event.clientX}, ${event.clientY}`,
    })}
  >
    Drag me
    <small style="display: block; opacity: 0.7">this text is also draggable</small>
  </div>

  <!-- Second draggable with custom handle and callbacks -->
  <div
    class="drag-box"
    style="position: absolute; left: 12rem; top: 8rem; width: 14rem"
    {@attach draggable({
      handle_selector: `.drag-handle`,
      on_drag_start: () => last_drag = `start`,
      on_drag: (event: PointerEvent) =>
        last_drag = `${event.clientX}, ${event.clientY}`,
      on_drag_end: () => last_drag = `end`,
    })}
  >
    <div class="drag-handle">Drag with custom callbacks</div>
    <small style="display: block; opacity: 0.7">this text is not draggable</small>
  </div>
</div>

<p>last pointer: {last_drag || '—'}</p>

<style>
  .drag-area {
    position: relative;
    height: 40vh;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    margin: 1rem 0;
    overflow: hidden;
  }
  .drag-box {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 0.6em 0.8em;
    width: max-content;
  }
</style>
```

### `highlight_matches`

```svelte example id="attachments-highlight"
<script lang="ts">
  import { highlight_matches } from '$lib'

  let search_text = $state('')
  let disabled = $state(false)

  // Only highlight inside .target; skip any node inside .no-hl
  const node_filter = (node: Node): number =>
    node.parentElement?.closest('.no-hl')
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT
</script>

<label style="display: inline-flex; gap: 0.6em; align-items: center">
  Search
  <input
    placeholder="type to highlight..."
    bind:value={search_text}
    style="min-width: 16ch"
  />
  <input id="toggle-disabled" type="checkbox" bind:checked={disabled} />
  <label for="toggle-disabled">disabled</label>
</label>

<article
  class="target"
  {@attach highlight_matches({ query: search_text.toLowerCase(), disabled, node_filter })}
>
  <p>
    This paragraph will highlight occurrences of the query across element boundaries. Try
    words like <em>ancient</em>, <strong>giant</strong>, or split-
    <span>word</span> matches.
  </p>
  <p class="no-hl" style="opacity: 0.7">
    This line is excluded via node_filter.
  </p>
</article>

<style>
  /* Style the CSS Highlight API range */
  ::highlight(highlight-match) {
    background: rgba(255, 230, 0, 0.35);
    outline: 1px solid rgba(255, 230, 0, 0.8);
  }
  .target {
    margin: 0.75rem 0;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;
  }
</style>
```

### `click_outside`

```svelte example id="attachments-click-outside"
<script lang="ts">
  import { click_outside, tooltip } from '$lib'

  let open_menu = $state(false)
</script>

<div class="menu">
  <button
    class="toggle"
    onclick={() => open_menu = !open_menu}
    {@attach tooltip({ content: 'Toggle menu', placement: 'top' })}
  >
    Menu
  </button>

  {#if open_menu}
    <div
      class="dropdown"
      {@attach click_outside({ exclude: ['.toggle'], callback: () => (open_menu = false) })}
    >
      <ul style="list-style: none; padding: 0; margin: 0">
        <li><a href="#one">First</a></li>
        <li><a href="#two">Second</a></li>
        <li>
          <a href="#noop" class="toggle">Clicking me won’t close (excluded)</a>
        </li>
      </ul>
    </div>
  {/if}
</div>

<style>
  .menu {
    position: relative;
    display: inline-block;
  }
  .dropdown {
    position: absolute;
    top: calc(100% + 0.4rem);
    left: 0;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    min-width: 12rem;
    z-index: 2;
  }
  .dropdown a {
    color: var(--text-color);
    text-decoration: none;
    display: block;
    padding: 0.2rem 0;
  }
  .dropdown a:hover {
    text-decoration: underline;
  }
</style>
```

### `sortable`

```svelte example id="attachments-sortable"
<script lang="ts">
  import { sortable } from '$lib'
</script>

<table {@attach sortable()} class="demo-table">
  <thead>
    <tr>
      <th>Planet</th>
      <th>Moons</th>
      <th>Discovery</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    {#each [
        { planet: `Mercury`, moons: 0, discovery: `ancient`, notes: `` },
        { planet: `Venus`, moons: 0, discovery: `ancient`, notes: `Very bright` },
        {
          planet: `Earth`,
          moons: 1,
          discovery: `ancient`,
          notes: `Leads with zeros`,
        },
        { planet: `Mars`, moons: 2, discovery: `1610`, notes: `Phobos/Deimos` },
        { planet: `Jupiter`, moons: 95, discovery: `1610`, notes: `Gas giant` },
      ] as
      { planet, moons, discovery, notes }
    }
      <tr>
        <td>{planet}</td>
        <td>{moons}</td>
        <td>{discovery}</td>
        <td>{notes}</td>
      </tr>
    {/each}
  </tbody>
  <caption style="caption-side: bottom; padding-top: 0.5em">
    Click headers to sort; click again to reverse
  </caption>
</table>

<style>
  .demo-table {
    width: 100%;
  }
  .demo-table th, .demo-table td {
    padding: 0.4em 0.6em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  thead th:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  tbody tr:nth-child(odd) {
    background: rgba(255, 255, 255, 0.04);
  }
  tbody tr:hover {
    background: rgba(255, 255, 255, 0.08);
  }
</style>
```

<style>
  h3, h3 code {
    font-size: 1.2em;
    margin-top: 2em;
  }
</style>
