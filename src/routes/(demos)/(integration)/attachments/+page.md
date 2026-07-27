## Attachments

Exported from `svelte-multiselect/attachments`:

- [`tooltip`](#tooltip)
- [`draggable`](#draggable)
- [`sortable`](#sortable)
- [`highlight_matches`](#highlight_matches)
- [`click_outside`](#click_outside)
- [`focus_trap`](#focus_trap)
- [`hotkey`](#hotkey)
- [`float`](#float)

### `tooltip`

```svelte example id="attachments-tooltip"
<script lang="ts">
  import { tooltip } from '$lib/attachments'

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
      // only enable allow_html for trusted or sanitized content, never raw
      // user input — HTML tooltips are an XSS vector otherwise
      allow_html: true,
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
  <button {@attach tooltip({ content: `Top`, placement: `top` })}> Top </button>
  <button {@attach tooltip({ content: `Right`, placement: `right` })}> Right </button>
  <button {@attach tooltip({ content: `Bottom (default)`, placement: `bottom` })}>
    Bottom
  </button>
  <button {@attach tooltip({ content: `Left`, placement: `left` })}> Left </button>
</div>

<!-- Style variations via CSS variables to demonstrate customization -->
<div style="display: flex; gap: 1em; margin: 2em 0">
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

<div style="display: flex; gap: 1em; margin: 2em 0">
  <button
    style="--tooltip-bg: #2d3748; --text-color: #e2e8f0; --tooltip-border: 2px solid #4299e1; --tooltip-arrow-size: 8"
    {@attach tooltip({
      content: `Custom style + border arrow`,
      placement: `top`,
      style: `box-shadow: 0 10px 25px rgba(66, 153, 225, 0.3); transform: scale(1.05);`,
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
      content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
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
  import { tooltip } from '$lib/attachments'
  let text = $state(`Edit me!`)
</script>

<input bind:value={text} style="width: 16ch" />
<button title={text} {@attach tooltip({ placement: `right` })}>Hover me</button>
```

### `draggable`

```svelte example id="attachments-draggable"
<script lang="ts">
  import { draggable } from '$lib/attachments'

  let last_drag: string = $state('')
</script>

<div class="drag-area">
  <!-- Absolute positioned box → default handle is the node itself -->
  <div
    class="drag-box"
    style="position: absolute; left: 1rem; top: 1rem"
    {@attach draggable({
      on_drag: (event: PointerEvent) =>
        (last_drag = `${event.clientX}, ${event.clientY}`),
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
      on_drag_start: () => (last_drag = `start`),
      on_drag: (event: PointerEvent) =>
        (last_drag = `${event.clientX}, ${event.clientY}`),
      on_drag_end: () => (last_drag = `end`),
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
  import { highlight_matches } from '$lib/attachments'

  let search_text = $state('')
  let disabled = $state(false)

  // Only highlight inside .target; skip any node inside .no-hl
  const node_filter = (node: Node): number =>
    node.parentElement?.closest('.no-hl')
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT
</script>

<div style="display: inline-flex; gap: 0.6em; align-items: center">
  <label for="highlight-search">Search</label>
  <input
    id="highlight-search"
    placeholder="type to highlight..."
    bind:value={search_text}
    style="min-width: 16ch"
  />
  <input id="toggle-disabled" type="checkbox" bind:checked={disabled} />
  <label for="toggle-disabled">disabled</label>
</div>

<article
  class="target"
  {@attach highlight_matches({
    query: search_text.toLowerCase(),
    disabled,
    node_filter,
    scroll_to_match: false,
  })}
>
  <p>
    This paragraph highlights matches inside text and inline elements. Try words like
    <em>ancient</em> or <strong>giant</strong>.
  </p>
  <p class="no-hl" style="opacity: 0.7">This line is excluded via node_filter.</p>
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

Use `css_class` to select a custom `::highlight()` rule, `duration_ms` to remove matches
automatically, and `on_highlight` for optional range-based effects.
`scroll_to_match` scrolls the first match smoothly into view by default; set it to `false`
to keep the viewport fixed or pass custom `ScrollIntoViewOptions`. `on_highlight` still
receives ranges without the CSS Highlight API and reruns when observed content changes.

### `click_outside`

```svelte example id="attachments-click-outside"
<script lang="ts">
  import { click_outside, tooltip } from '$lib/attachments'

  let open_menu = $state(false)
</script>

<div class="menu">
  <button
    class="toggle"
    onclick={() => (open_menu = !open_menu)}
    {@attach tooltip({ content: 'Toggle menu', placement: 'top' })}
  >
    Menu
  </button>

  {#if open_menu}
    <div
      class="dropdown"
      {@attach click_outside({
        inside: ['.toggle'],
        escape: true,
        callback: () => (open_menu = false),
      })}
    >
      <ul style="list-style: none; padding: 0; margin: 0">
        <li><a href="#one">First</a></li>
        <li><a href="#two">Second</a></li>
        <li>
          <a href="#noop" class="toggle">Clicking me won’t close (counts as inside)</a>
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

Dismissal happens on `pointerdown`, not `click`, so a right-click or a press the OS
turns into a window drag still closes the surface. Presses that land in a scrollbar
gutter are ignored, so reaching for the scrollbar does not close what you are
scrolling toward. A surface floating over something draggable can pass
`dismiss_on: 'release'` to wait for the click instead, so starting a pan behind it
does not make it vanish mid-drag.

Pass `inside` for regions that count as inside though they sit outside the node:
elements for portalled content the node no longer contains, selectors for triggers.
`scope` confines the selector entries to one subtree when several instances of a
component share trigger selectors, and `escape: true` also dismisses on Escape. Escape
dismisses one surface at a time — the most recently attached one — so a dropdown
inside a modal closes the dropdown and leaves the modal standing.

`callback` receives `(node, config, detail)` and the node also fires a `dismiss`
event carrying the same `detail` of `{ focus_inside, via, event }`. `focus_inside`
tells an Escape handler whether to move focus back to the trigger, and `event` is the
press or keydown behind the dismissal, to forward to your own close handler.

### `focus_trap`

Keeps Tab inside a surface and hands the keyboard back when it closes — the other half
of what `click_outside` starts. Nested traps stack like Escape layers: only the
innermost one steers Tab.

```svelte example id="attachments-focus-trap"
<script lang="ts">
  import { click_outside, focus_trap } from '$lib/attachments'

  let open = $state(false)
  let trigger = $state<HTMLButtonElement | null>(null)
</script>

<button bind:this={trigger} onclick={() => (open = true)}>Open panel</button>

{#if open}
  <div
    role="dialog"
    aria-label="Trapped panel"
    style="display: grid; gap: 6pt; max-width: 20em; margin-top: 1ex; padding: 1ex 1em; border: 1px solid gray; border-radius: 5pt"
    {@attach focus_trap({ restore: trigger })}
    {@attach click_outside({ escape: true, callback: () => (open = false) })}
  >
    <input placeholder="Tab cycles between these" />
    <input placeholder="…and never leaves the panel" />
    <button onclick={() => (open = false)}>Close</button>
  </div>
{/if}
```

`initial` picks the entry point (an element, a selector, or `false` to leave focus
alone) and `restore` the exit point, defaulting to whatever held focus when the trap
went up. `include` extends the trap over portalled parts of the same surface.

### `hotkey`

Declarative keybindings over the same matcher `CommandMenu` uses. `mod` is Cmd on Apple
keyboards and Ctrl elsewhere. Bare keys stay out of the way while you type in a field;
chords always fire.

```svelte example id="attachments-hotkey"
<script lang="ts">
  import { hotkey } from '$lib/attachments'

  let log = $state<string[]>([])
  const record = (label: string) => (log = [label, ...log].slice(0, 5))
</script>

<div
  style="display: grid; gap: 6pt"
  {@attach hotkey({
    global: true,
    bindings: [
      { keys: `mod+b`, handler: () => record(`bold`) },
      { keys: [`?`, `shift+/`], handler: () => record(`help`) },
      { keys: `Enter`, handler: () => record(`submit`), allow_in_inputs: true },
    ],
  })}
>
  <input placeholder="mod+b works here, ? does not, Enter does" />
  <ol>
    {#each log as entry, idx (idx)}<li>{entry}</li>{/each}
  </ol>
</div>
```

Pass `global: false` (the default) to scope a binding to the node it is attached to, so
a shortcut dies with the surface that owns it.

### `float`

Parks an element next to an anchor and keeps it there while the page scrolls or
resizes. The geometry — flip to the side that fits, then shift to stay on screen —
comes from `compute_position` in `svelte-multiselect/utils`, which the tooltip and the
portalled dropdown also use. The anchor can be a plain rect instead of an element,
which is how `ContextMenu` hangs a menu off the pointer.

```svelte example id="attachments-float"
<script lang="ts">
  import { float } from '$lib/attachments'
  import type { Placement } from '$lib/utils'

  let anchor = $state<HTMLElement | null>(null)
  let placement = $state<Placement>(`bottom`)
</script>

<select bind:value={placement}>
  {#each [`top`, `right`, `bottom`, `left`] as side (side)}<option>{side}</option>{/each}
</select>

<div style="display: grid; place-items: center; height: 12em">
  <span bind:this={anchor} style="padding: 1ex 1em; border: 1px dashed gray">anchor</span>
</div>

<div
  style="background: teal; color: white; padding: 2pt 6pt; border-radius: 4pt"
  {@attach float({ anchor, placement, offset: 8, padding: 8 })}
>
  floating
</div>
```

### `sortable`

```svelte example id="attachments-sortable"
<script lang="ts">
  import { sortable } from '$lib/attachments'

  const planets = [
    { planet: `Mercury`, moons: 0, discovery: `ancient`, notes: `` },
    { planet: `Venus`, moons: 0, discovery: `ancient`, notes: `Very bright` },
    { planet: `Earth`, moons: 1, discovery: `ancient`, notes: `Leads with zeros` },
    { planet: `Mars`, moons: 2, discovery: `1610`, notes: `Phobos/Deimos` },
    { planet: `Jupiter`, moons: 95, discovery: `1610`, notes: `Gas giant` },
  ]
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
    {#each planets as { planet, moons, discovery, notes }}
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
  .demo-table :is(th, td) {
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
