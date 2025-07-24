## MultiSelect Events

This demo showcases all the events that `<MultiSelect>` emits. Each event type is demonstrated with interactive examples and real-time logging.

```svelte example
<script>
  import MultiSelect from '$lib'
  import { ColorSnippet } from '$site'
  import { colors } from '$site/options'
  import { get_label } from '$lib/utils'

  let events = $state([])
  let selected_options = $state([])
  let allowUserOptions = $state(true)

  function log_event(event_name, data) {
    events = [
      {
        event: event_name,
        data: JSON.stringify(data, null, 2),
        timestamp: new Date().toLocaleTimeString(),
      },
      ...events.slice(0, 9), // Keep last 10 events
    ]
  }
</script>

<div class="demo-grid">
  <section class="demo-section">
    <p>
      Select options, remove them, use "Remove all", create custom options, and interact
      with the input.
    </p>

    <label style="display: block; margin-block: 1em">
      <input type="checkbox" bind:checked={allowUserOptions} />
      Allow user options
    </label>

    <MultiSelect
      options={colors}
      placeholder="Select colors or type to create custom..."
      {allowUserOptions}
      createOptionMsg="Create custom color..."
      duplicates
      maxSelect={5}
      onadd={(data) => log_event('onadd', data)}
      onremove={(data) => log_event('onremove', data)}
      onremoveAll={(data) => log_event('onremoveAll', data)}
      onchange={(data) => log_event('onchange', data)}
      oncreate={(data) => log_event('oncreate', data)}
      onopen={(data) => log_event('onopen', data)}
      onclose={(data) => log_event('onclose', data)}
      onblur={(event) =>
      log_event('onblur', { type: event.type, target: event.target?.tagName })}
      onclick={(event) =>
      log_event('onclick', { type: event.type, target: event.target?.tagName })}
      onfocus={(event) =>
      log_event('onfocus', { type: event.type, target: event.target?.tagName })}
      onkeydown={(event) =>
      log_event('onkeydown', {
        type: event.type,
        key: event.key,
        code: event.code,
      })}
      bind:selected={selected_options}
    >
      {#snippet children({ idx, option })}
        <ColorSnippet {idx} {option} />
      {/snippet}
    </MultiSelect>

    <div class="selected-info">
      <strong>Selected ({selected_options.length}):</strong>
      {selected_options.map((opt) => get_label(opt)).join(', ')}
    </div>
  </section>

  <section class="event-log">
    <header class="log-header">
      <h3>Event Log</h3>
      <button onclick={() => events = []}>Clear</button>
    </header>

    {#if events.length === 0}
      <p class="no-events">No events yet. Start clicking around!</p>
    {:else}
      {#each events as entry}
        <article class="log-entry">
          <header class="entry-header">
            <span class="event-name">{entry.event}</span>
            <span class="timestamp">{entry.timestamp}</span>
          </header>
          <pre class="log-data">{entry.data}</pre>
        </article>
      {/each}
    {/if}
  </section>
</div>

<style>
  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1em;
    margin: 2em 0;
  }
  .demo-section {
    background: rgba(255, 255, 255, 0.05);
    padding: 1.5em;
    border-radius: 8px;
  }
  .selected-info {
    margin-top: 1em;
    padding: 0.5em;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    font-size: 0.9em;
  }
  .event-log {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    max-height: 600px;
    overflow-y: auto;
    padding: 0 1em 1em 1em;
  }
  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1em 1em 0.5em 1em;
    background: rgba(0, 0, 0, 0.3);
    position: sticky;
    top: 0;
    margin: -1em -1em 1em -1em;
  }
  .log-header button {
    background: #4a5568;
    color: white;
    border: none;
    padding: 0.5em 1em;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
  }
  .log-header button:hover {
    background: #2d3748;
  }
  .log-entry {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 0.75em;
    border-left: 3px solid #4299e1;
    margin-bottom: 0.75em;
  }
  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5em;
  }
  .event-name {
    font-weight: bold;
    color: #4299e1;
    font-size: 0.9em;
  }
  .timestamp {
    font-size: 0.8em;
    color: #a0aec0;
  }
  .log-data {
    background: rgba(0, 0, 0, 0.3);
    padding: 0.5em;
    border-radius: 3px;
    font-size: 0.8em;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .no-events {
    color: #a0aec0;
    font-style: italic;
    text-align: center;
    padding: 2em;
  }
</style>
```

### Event Reference

Here's a complete reference of all MultiSelect events:

#### Custom Events

| Event         | Description                                    | Data Structure                                                          |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `onadd`       | Fired when an option is added to selection     | `{ option: T }`                                                         |
| `onremove`    | Fired when an option is removed from selection | `{ option: T }`                                                         |
| `onremoveAll` | Fired when all options are removed             | `{ options: T[] }`                                                      |
| `onchange`    | Fired for any selection change                 | `{ option?: T, options?: T[], type: 'add' \| 'remove' \| 'removeAll' }` |
| `oncreate`    | Fired when user creates a custom option        | `{ option: T }`                                                         |
| `onopen`      | Fired when dropdown opens                      | `{ event: Event }`                                                      |
| `onclose`     | Fired when dropdown closes                     | `{ event: Event }`                                                      |

#### Native DOM Events

| Event           | Description              |
| --------------- | ------------------------ |
| `onblur`        | Input loses focus        |
| `onclick`       | Input is clicked         |
| `onfocus`       | Input gains focus        |
| `onkeydown`     | Key is pressed down      |
| `onkeyup`       | Key is released          |
| `onmousedown`   | Mouse button is pressed  |
| `onmouseenter`  | Mouse enters input area  |
| `onmouseleave`  | Mouse leaves input area  |
| `ontouchcancel` | Touch event is cancelled |
| `ontouchend`    | Touch ends               |
| `ontouchmove`   | Touch moves              |
| `ontouchstart`  | Touch begins             |

### Event Handling Tips

1. **Destructuring Safety**: Always check for `event.detail` before destructuring:

   ```javascript
   function handleChange(event) {
     if (!event.detail) return // Guard against undefined detail
     const { option, type } = event.detail
     // ... handle the event
   }
   ```

2. **Type Safety**: For better type checking in TypeScript projects, use interfaces:

   ```javascript
   // In TypeScript files, you can define interfaces like this:
   // interface ChangeEvent {
   //   option?: Option;
   //   options?: Option[];
   //   type: 'add' | 'remove' | 'removeAll';
   // }
   ```

3. **Event Order**: Events fire in this order:
   - `onopen` → `onadd`/`onremove` → `onchange` → `onclose`

4. **Custom Options**: The `oncreate` event only fires when `allowUserOptions` is enabled and users type text that doesn't match existing options.
