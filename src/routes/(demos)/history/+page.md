## Selection History (Undo/Redo)

Selection history is **enabled by default**, allowing users to undo and redo their selections with `Ctrl+Z` / `Cmd+Z` and `Ctrl+Shift+Z` / `Cmd+Shift+Z`. This is useful for complex selection workflows where users might want to revert changes.

### Basic Usage

History tracking works out of the box with a default max of 50 entries. Pass a number to customize the limit, or `false`/`0` to disable.

```svelte example
<script>
  import MultiSelect from '$lib'
  import { ColorSnippet } from '$site'
  import { colors } from '$site/options'

  let selected = $state([])
  let undo = $state()
  let redo = $state()
  let canUndo = $state(false)
  let canRedo = $state(false)
  let events = $state([])
  // Use same platform detection as component (userAgentData is modern API, userAgent is fallback)
  const is_mac = typeof navigator !== 'undefined' &&
    (navigator.userAgentData?.platform === 'macOS' ||
      /Mac|iPhone|iPad|iPod/.test(navigator.userAgent))
  const mod_key = is_mac ? 'Cmd' : 'Ctrl'

  function log_event(name, data) {
    events = [
      { name, data: JSON.stringify(data), time: new Date().toLocaleTimeString() },
      ...events.slice(0, 4),
    ]
  }
</script>

<div class="demo-grid" id="history-demo">
  <section class="controls" id="history-multiselect">
    <p class="tip">
      Use <kbd>{mod_key}+Z</kbd> to undo and <kbd>{mod_key}+Shift+Z</kbd> to redo.
    </p>

    <div class="button-group">
      <button id="undo-btn" onclick={() => undo?.()} disabled={!canUndo}>
        ↩ Undo
      </button>
      <button id="redo-btn" onclick={() => redo?.()} disabled={!canRedo}>
        Redo ↪
      </button>
    </div>

    <MultiSelect
      options={colors}
      history={true}
      placeholder="Select colors..."
      bind:selected
      bind:undo
      bind:redo
      bind:canUndo
      bind:canRedo
      onundo={(data) => log_event('onundo', data)}
      onredo={(data) => log_event('onredo', data)}
    >
      {#snippet children({ idx, option })}
        <ColorSnippet {idx} {option} />
      {/snippet}
    </MultiSelect>

    <p class="status">
      <span id="selection-count">Selected: {selected.length} item{
          selected.length !== 1 ? 's' : ''
        }</span>
      <span>canUndo: <strong id="can-undo-status">{canUndo}</strong></span>
      <span>canRedo: <strong id="can-redo-status">{canRedo}</strong></span>
    </p>
  </section>

  <section class="event-log" id="history-event-log">
    <h4>Event Log</h4>
    {#each events as entry}
      <div class="log-entry">
        <span class="event-name">{entry.name}</span>
        <span class="time">{entry.time}</span>
        <pre>{entry.data}</pre>
      </div>
    {:else}
      <p class="no-events">Undo/redo events will appear here</p>
    {/each}
  </section>
</div>

<style>
  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1em;
    margin: 2em 0;
  }
  .controls {
    background: light-dark(#f0f7ff, rgba(66, 153, 225, 0.1));
    padding: 1.5em;
    border-radius: 8px;
    align-self: start;
  }
  .button-group {
    display: flex;
    gap: 0.5em;
    margin-bottom: 1.5em;
  }
  .button-group button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    padding: 0.2em 0.5em;
    border: 1px solid light-dark(#ccc, #555);
    background: light-dark(#fff, #333);
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
  }
  .button-group button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .button-group button:not(:disabled):hover {
    background: light-dark(#f0f0f0, #444);
  }
  .tip {
    font-size: 0.85em;
    color: light-dark(#666, #999);
    margin: 0 0 1em 0;
  }
  .status {
    display: flex;
    gap: 1em;
    font-size: 0.85em;
    color: light-dark(#666, #aaa);
    margin-top: 1em;
  }
  kbd {
    background: light-dark(#eee, #444);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }
  .event-log {
    background: light-dark(#f0f7ff, rgba(66, 153, 225, 0.1));
    padding: 1em;
    border-radius: 8px;
    overflow-y: auto;
    align-self: start;
    height: 100%;
    box-sizing: border-box;
  }
  .event-log h4 {
    margin: 0 0 0.5em 0;
  }
  .log-entry {
    background: light-dark(#fff, rgba(255, 255, 255, 0.05));
    padding: 0.5em;
    border-radius: 4px;
    margin-bottom: 0.5em;
    font-size: 0.85em;
  }
  .event-name {
    color: #4299e1;
    font-weight: bold;
  }
  .time {
    float: right;
    color: light-dark(#999, #666);
  }
  .log-entry pre {
    margin: 0.5em 0 0 0;
    font-size: 0.9em;
    background: light-dark(#eee, rgba(0, 0, 0, 0.3));
    padding: 0.3em;
    border-radius: 2px;
  }
  .no-events {
    color: light-dark(#999, #666);
    font-style: italic;
    text-align: center;
  }
</style>
```

### Props Reference

| Prop      | Type                | Default | Description                                                                                  |
| --------- | ------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `history` | `boolean \| number` | `true`  | Enable history (default). `true` = max 50 entries, number = custom limit, `false` = disabled |
| `undo`    | `() => boolean`     | -       | Bindable function to undo last change. Returns `false` if nothing to undo                    |
| `redo`    | `() => boolean`     | -       | Bindable function to redo last undone change. Returns `false` if nothing to redo             |
| `canUndo` | `boolean`           | `false` | Bindable state indicating if undo is available                                               |
| `canRedo` | `boolean`           | `false` | Bindable state indicating if redo is available                                               |

### Events

| Event    | Data                              | Description                  |
| -------- | --------------------------------- | ---------------------------- |
| `onundo` | `{ previous: T[], current: T[] }` | Fired after undo is executed |
| `onredo` | `{ previous: T[], current: T[] }` | Fired after redo is executed |

### Keyboard Shortcuts

History supports platform-aware keyboard shortcuts:

- **Mac**: `Cmd+Z` (undo), `Cmd+Shift+Z` (redo)
- **Windows/Linux**: `Ctrl+Z` (undo), `Ctrl+Shift+Z` (redo)

Custom shortcuts can be configured via the `shortcuts` prop:

```svelte
<MultiSelect
  history={true}
  shortcuts={{ undo: 'alt+z', redo: 'alt+shift+z' }}
/>
```

### Implementation Notes

- History tracks all changes to `selected`, including external prop updates
- Taking a new action after undoing clears the redo stack (standard behavior)
- Undo/redo are blocked when the component is `disabled`
- History entries store full snapshots of the `selected` array
