<script lang="ts">
  // Outside controls driving the pane's `show`, for its dismiss_on tests: a bound checkbox
  // and a button that opens on pointerdown, neither of them in the pane's `inside` list.
  import DraggablePane from '$lib/DraggablePane.svelte'

  let {
    dismiss_on,
    show = $bindable(false),
  }: { dismiss_on: `press` | `release`; show?: boolean } = $props()
</script>

<input type="checkbox" bind:checked={show} />
<button data-testid="pointerdown-trigger" onpointerdown={() => (show = true)}>open</button
>
<DraggablePane bind:show {dismiss_on}>
  {#snippet children()}
    <div data-testid="content">pane content</div>
  {/snippet}
</DraggablePane>
