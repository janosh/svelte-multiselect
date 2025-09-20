<script lang="ts">
  import MultiSelect from '$lib'
  import { get_label } from '$lib/utils'
  import { languages, octicons } from '$site/options'

  let open_modal = $state(false)
  let selected_languages = $state<string[]>([])
  let selected_octicons = $state<string[]>([])

  function handle_escape(event: KeyboardEvent): void {
    if (event.key === `Escape`) open_modal = false
  }
</script>

<svelte:window onkeydown={handle_escape} />

<h2>Portalled MultiSelect in Modal Demo</h2>

<button onclick={() => (open_modal = true)} style="padding: 3pt 6pt; margin: 1em auto">
  Open Modal
</button>

{#if open_modal}
  <div
    class="modal-backdrop"
    onclick={(event) => {
      if (event.target === event.currentTarget) open_modal = false
    }}
    onkeydown={(event) => {
      if (event.key === `Enter` || event.key === ` `) open_modal = false
    }}
    role="button"
    tabindex="0"
  >
    <div
      class="modal-content modal"
      onkeydown={(event) => {
        if (event.key !== `Escape`) event.stopPropagation()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <h2 id="modal-title">Modal: Languages & Octicons</h2>
      <MultiSelect
        bind:selected={selected_languages}
        options={languages}
        portal={{ active: true }}
        placeholder="Choose languages..."
        style="margin-bottom: 1em"
      />
      <MultiSelect
        bind:selected={selected_octicons}
        options={octicons}
        portal={{ active: true }}
        placeholder="Choose octicons..."
      />
      <p>Selected Languages: {selected_languages.map(get_label).join(`, `) || `None`}</p>
      <p>Selected Octicons: {selected_octicons.map(get_label).join(`, `) || `None`}</p>
      <button onclick={() => (open_modal = false)}>Close Modal 2</button>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .modal-content {
    background-color: var(--modal-bg, #2d2d2d);
    padding: 10px 20px 20px;
    border-radius: 8px;
  }
  .modal-content h2 {
    margin-top: 0;
  }
  .modal-content button {
    background-color: #555;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 1em; /* Add some space above the close button */
  }
  .modal-content button:hover {
    background-color: #666;
  }
</style>
