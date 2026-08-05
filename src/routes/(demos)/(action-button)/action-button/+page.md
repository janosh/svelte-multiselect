## ActionButton

Use `ActionButton` for save, retry, refresh, download or other synchronous and asynchronous actions. It blocks duplicate activation while pending, exposes the action result to callbacks and snippets, and returns to `ready` after `reset_ms`.

```svelte example
<script lang="ts">
  import { ActionButton, type ActionState } from '$lib'

  let action_state = $state<ActionState>(`ready`)
  let save_count = $state(0)
  let last_result = $state<number>()

  const save = async (): Promise<number> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 500))
    return (save_count += 1)
  }

  const labels = {
    ready: { text: `Save` },
    pending: { text: `Saving…` },
    success: { text: `Saved` },
    error: { text: `Retry` },
  } as const
</script>

<ActionButton
  action={save}
  bind:state={action_state}
  {labels}
  reset_ms={1500}
  on_success={(result) => (last_result = result)}
/>
<p>State: {action_state}; result: {last_result ?? `none yet`}</p>
```

## CopyButton

`CopyButton` composes `ActionButton` into a copy-to-clipboard control with bindable state, custom labels, success/error callbacks and configurable reset timing. This site mounts one in `global` mode on every code block.

```svelte example
<script lang="ts">
  import { CopyButton } from '$lib'

  let content = $state(`npm test`)
  let disabled = $state(false)
  let reset_ms = $state(2000)
  let state = $state<`ready` | `success` | `error`>(`ready`)
</script>

<p style="display: flex; gap: 8pt; align-items: center; flex-wrap: wrap">
  <input bind:value={content} style="min-width: 16em" />
  <CopyButton {content} bind:state {disabled} {reset_ms} />
  <label>
    reset_ms:
    <input type="number" min="0" step="500" bind:value={reset_ms} style="width: 5em" />
  </label>
  <label><input type="checkbox" bind:checked={disabled} /> disabled</label>
</p>
<p>State: {state}</p>
```
