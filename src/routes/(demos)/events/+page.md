## MultiSelect Events

This demo showcases all the events that `<MultiSelect>` emits. Each emitted event is recorded in the event log panel on the right.

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
    Select options, remove them, use "Remove all", create custom options, and interact
    with the input.

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
  </section>

  <section class="event-log">
    <header class="log-header">
      <h3 style="margin: 0">Event Log</h3>
      <button onclick={() => events = []}>Clear</button>
    </header>

    {#each events as entry}
      <article class="log-entry">
        <header class="entry-header">
          <span class="event-name">{entry.event}</span>
          <span class="timestamp">{entry.timestamp}</span>
        </header>
        <pre class="log-data">{entry.data}</pre>
      </article>
    {:else}
      <p class="no-events">No events yet. Start clicking around!</p>
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
  .demo-section {
    background: light-dark(#f9f9f9, rgba(255, 255, 255, 0.05));
    padding: 1.5em;
    border-radius: 8px;
  }
  .event-log {
    background: light-dark(#f5f5f5, rgba(0, 0, 0, 0.3));
    border-radius: 8px;
    max-height: 60vh;
    overflow-y: auto;
    display: grid;
    gap: 1em;
  }
  .log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--surface);
    height: max-content;
    padding: 1pt 9pt;
  }
  .log-entry {
    background: light-dark(#fff, rgba(255, 255, 255, 0.05));
    border-radius: 4px;
    padding: 1ex 1em;
    border-left: 3px solid #4299e1;
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
    color: light-dark(#666, #a0aec0);
  }
  .log-data {
    background: light-dark(#eee, rgba(0, 0, 0, 0.3));
    padding: 0.5em;
    border-radius: 3px;
    font-size: 0.8em;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .no-events {
    color: light-dark(#666, #a0aec0);
    font-style: italic;
    text-align: center;
    padding: 2em;
  }
</style>
```

### Event Reference

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

1. **Destructuring Safety**: Check for `event.detail` before destructuring:

   ```ts
   function handleChange(event) {
     if (!event.detail) return // Guard against undefined detail
     const { option, type } = event.detail
     // ... handle the event
   }
   ```

1. **Type Safety**: For better type checking in TypeScript projects, use `MultiSelectEvents` and `MultiSelectNativeEvents` interfaces:

   ```ts
   <script lang="ts">
    import type { MultiSelectEvents, MultiSelectNativeEvents } from '$lib/types'

     const onadd: MultiSelectEvents['onadd'] = (data) => {
       console.log(`onadd`, data)
     }

     const onblur: MultiSelectNativeEvents['onblur'] = (event) => {
       console.log(`onblur`, event)
     }
   </script>

   <MultiSelect {onadd} {onblur} options={[{ label: `foo` }]} />
   ```

1. **Custom Options**: The `oncreate` event only fires when `allowUserOptions` is enabled and users type text that doesn't match existing options.
