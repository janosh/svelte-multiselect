<script lang="ts">
  // A real component, because `bind:checked` writing back through a parent's state is the
  // whole mechanism under test — a hand-built checkbox would not exercise it.
  import DraggablePane from '$lib/DraggablePane.svelte'

  let {
    dismiss_on,
    show = $bindable(false),
  }: { dismiss_on?: `press` | `release`; show?: boolean } = $props()
</script>

<input type="checkbox" bind:checked={show} />
<button data-testid="pointerdown-trigger" onpointerdown={() => (show = true)}>open</button
>
<DraggablePane bind:show {dismiss_on}>
  {#snippet children()}
    <div data-testid="content">pane content</div>
  {/snippet}
</DraggablePane>
