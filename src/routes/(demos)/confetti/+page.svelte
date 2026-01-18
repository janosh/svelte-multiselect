<script lang="ts">
  import Confetti from '$site/Confetti.svelte'

  let n_items = $state(50)
  let freeze = $state(false)
</script>

<h1>Confetti Test</h1>

<label>
  n_items: {n_items}
  <input type="range" min="10" max="200" bind:value={n_items} />
</label>

<label>
  <input type="checkbox" bind:checked={freeze} />
  Freeze
</label>

<Confetti {n_items} {freeze} />

<style>
  label {
    display: block;
    margin: 1em 0;
  }
  input[type='range'] {
    width: 300px;
    margin-left: 1em;
  }
</style>
