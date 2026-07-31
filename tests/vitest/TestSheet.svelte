<script lang="ts">
  import Sheet from '$lib/Sheet.svelte'
  import type { ComponentProps } from 'svelte'

  // Compile-time coverage: Sheet accepts native dialog attributes while its parameterized
  // children snippet remains a snippet rather than HTMLAttributes.children.
  let {
    open = $bindable(false),
    nested = false,
    ...props
  }: Omit<ComponentProps<typeof Sheet>, `children`> & { nested?: boolean } = $props()
  let nested_open = $state(true)
</script>

<div data-testid="sheet-home">
  <Sheet
    {...props}
    bind:open
    aria-labelledby="test-sheet-title"
    data-testid="sheet-surface"
  >
    {#snippet trigger(trigger_props)}
      <button data-testid="sheet-trigger" {...trigger_props}>Open sheet</button>
    {/snippet}
    {#snippet header({ close })}
      <h2 id="test-sheet-title">Settings</h2>
      <button type="button" data-testid="sheet-close" onclick={close}>Close</button>
    {/snippet}
    {#snippet children({ close })}
      <button type="button" data-testid="sheet-action" onclick={close}>Save</button>
      {#if nested}
        <Sheet
          bind:open={nested_open}
          aria-label="Nested sheet"
          data-testid="nested-sheet"
        >
          Nested content
        </Sheet>
      {/if}
    {/snippet}
    {#snippet footer()}
      <small data-testid="sheet-footer">Unsaved changes</small>
    {/snippet}
  </Sheet>
</div>
