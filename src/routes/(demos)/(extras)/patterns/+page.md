## Tabs

`Tabs` keeps selection bindable and supports automatic or manual keyboard activation. It intentionally ships no visual chrome; style `.tabs-list`, `.tabs-tab`, `.tabs-panel` and their `data-state` attributes.

```svelte example id="patterns-tabs"
<script lang="ts">
  import { Tabs } from '$lib'

  const items = [
    { value: `overview`, label: `Overview` },
    { value: `api`, label: `API` },
    { value: `disabled`, label: `Disabled`, disabled: true },
  ] as const
  let value = $state<(typeof items)[number][`value`]>(`overview`)
</script>

<Tabs {items} bind:value activation="manual" label="Package sections">
  {#snippet panel({ item })}
    <p>{item.label} panel. Current value: <code>{value}</code>.</p>
  {/snippet}
</Tabs>
```

## Accordion

`Accordion` uses real heading buttons and regions. Set `multiple` to bind an array of open values. It is also headless: `.accordion-item`, `.accordion-trigger`, `.accordion-panel` and `data-state` are the styling hooks.

```svelte example id="patterns-accordion"
<script lang="ts">
  import { Accordion } from '$lib'

  const items = [
    { value: `install`, label: `Installation` },
    { value: `usage`, label: `Usage` },
    { value: `disabled`, label: `Unavailable`, disabled: true },
  ] as const
  let value = $state<string[]>([`install`])
</script>

<Accordion {items} multiple bind:value>
  {#snippet panel({ item })}
    <p>Content for {item.label}.</p>
  {/snippet}
</Accordion>
```

## Sheet

`Sheet` portals to the document body, traps focus, dismisses from its backdrop or Escape and returns focus to its trigger.

```svelte example id="patterns-sheet"
<script lang="ts">
  import { Sheet } from '$lib'

  let open = $state(false)
</script>

<Sheet bind:open side="right" aria-label="Settings">
  {#snippet trigger(props)}
    <button {...props}>Open settings</button>
  {/snippet}
  {#snippet header({ close })}
    <strong>Settings</strong>
    <button onclick={close}>Close</button>
  {/snippet}
  <label>Project name <input value="Svelte Widgets" /></label>
  {#snippet footer({ close })}
    <button onclick={close}>Done</button>
  {/snippet}
</Sheet>
```
