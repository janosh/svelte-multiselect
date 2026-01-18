<script lang="ts">
  import Wiggle from '$lib/Wiggle.svelte'

  let wiggle = $state(false)
  let angle = $state(20)
  let scale = $state(1.2)
  let dx = $state(10)
  let dy = $state(10)
  let duration = $state(200)
  let stiffness = $state(0.05)
  let damping = $state(0.1)
</script>

<div
  class="demo"
  onclick={() => (wiggle = true)}
  onkeydown={(event) => event.key === `Enter` && (wiggle = true)}
  role="button"
  tabindex="0"
>
  <Wiggle
    bind:wiggle
    {angle}
    {scale}
    {dx}
    {dy}
    {duration}
    spring_options={{ stiffness, damping }}
    style="display: inline-block; padding: 0.5em 1em; background: var(--surface); border-radius: 6px"
  >
    🎯 Click to wiggle!
  </Wiggle>
</div>

<div class="controls">
  <label>
    angle: {angle}
    <input type="range" min="0" max="45" step="1" bind:value={angle} />
  </label>
  <label>
    scale: {scale.toFixed(2)}
    <input type="range" min="1" max="2" step="0.05" bind:value={scale} />
  </label>
  <label>
    dx: {dx}
    <input type="range" min="0" max="50" step="1" bind:value={dx} />
  </label>
  <label>
    dy: {dy}
    <input type="range" min="0" max="50" step="1" bind:value={dy} />
  </label>
  <label>
    duration: {duration}ms
    <input type="range" min="50" max="1000" step="50" bind:value={duration} />
  </label>
  <label>
    stiffness: {stiffness.toFixed(2)}
    <input type="range" min="0.01" max="0.5" step="0.01" bind:value={stiffness} />
  </label>
  <label>
    damping: {damping.toFixed(2)}
    <input type="range" min="0.01" max="1" step="0.01" bind:value={damping} />
  </label>
</div>

<style>
  .demo {
    font-size: 1.5em;
    text-align: center;
    margin: 1em 0;
    cursor: pointer;
  }
  .controls {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1em;
  }
  input[type='range'] {
    width: 100%;
  }
</style>
