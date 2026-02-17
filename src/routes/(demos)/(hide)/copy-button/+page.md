## CopyButton

One compact internal demo for `CopyButton`, kept outside the main demo navigation. It uses a
single interactive example to cover ready/success/error states, disabled behavior, empty-content
guard, and reset timing.

```svelte example
<script lang="ts">
  import { CopyButton, tooltip } from '$lib'

  type Copy_state = `ready` | `success` | `error`

  let content = $state(`pnpm test`)
  let disabled = $state(false)
  let reset_sec = $state(2)
  let state = $state<Copy_state>(`ready`)
  let copied_value = $state(``)
  let copy_error = $state(``)
  let callback_events = $state<string[]>([])

  const labels = {
    ready: { icon: `Copy`, text: `ready` },
    success: { icon: `Check`, text: `success` },
    error: { icon: `Alert`, text: `error` },
  } as const

  const push_event = (event_name: string, payload: string): void => {
    callback_events = [`${event_name}: ${payload}`, ...callback_events].slice(0, 5)
  }

  const handle_copy_success = (copied_content: string): void => {
    copied_value = copied_content
    copy_error = ``
    push_event(`on_copy_success`, copied_content || `""`)
  }

  const handle_copy_error = (error: unknown): void => {
    const error_message = String(error)
    copy_error = error_message
    push_event(`on_copy_error`, error_message)
  }
</script>

<p style="display: flex; gap: 6pt; align-items: center; flex-wrap: wrap; margin: 0 0 8pt">
  <CopyButton
    {content}
    bind:state
    {disabled}
    {reset_sec}
    {labels}
    on_copy_success={handle_copy_success}
    on_copy_error={handle_copy_error}
  />
  <input bind:value={content} style="min-width: 16em" />
</p>

<div
  style="display: flex; gap: 12pt; align-items: center; flex-wrap: wrap; margin: 0 0 8pt; font-size: 0.9em"
>
  <label>
    <span
      style="cursor: help; text-decoration: underline dotted"
      title="reset_sec is in seconds. Zero or negative values disable auto-reset"
      {@attach tooltip()}
    >
      reset_sec:
    </span>
    <input type="number" min="-1" step="0.5" bind:value={reset_sec} style="width: 5em" />
  </label>
  <label>
    <input type="checkbox" bind:checked={disabled} />
    disabled
  </label>
</div>

<p><strong>Copied:</strong> {copied_value || `nothing yet`}</p>
{#if copy_error}
  <p><strong>Error:</strong> {copy_error}</p>
{/if}

<p style="margin: 8pt 0 0"><strong>Callback events:</strong></p>
{#if callback_events.length}
  <ul style="margin: 6pt 0 0; padding-left: 1.25em">
    {#each callback_events as callback_event}
      <li><code>{callback_event}</code></li>
    {/each}
  </ul>
{:else}
  <p style="margin: 6pt 0 0; opacity: 0.8">No callback events yet.</p>
{/if}
```
