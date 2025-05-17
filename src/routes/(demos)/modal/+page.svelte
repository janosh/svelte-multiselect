<script lang="ts">
  import MultiSelect from '$lib'
  import { get_label } from '$lib/utils'
  import { colors, foods, languages, octicons } from '$site/options'

  let show_modal_1 = $state(false)
  let show_modal_2 = $state(false)

  const foods_options = foods
  const colors_options = colors

  let selected_foods = $state<string[]>([])
  let selected_colors = $state<string[]>([])
  let selected_languages = $state<string[]>([])
  let selected_octicons = $state<string[]>([])

  function handle_escape(event: KeyboardEvent): void {
    if (event.key === `Escape`) {
      show_modal_1 = false
      show_modal_2 = false
    }
  }
</script>

<svelte:window onkeydown={handle_escape} />

<h2>MultiSelect in Modal Demo</h2>

<div class="button-bar">
  <button onclick={() => (show_modal_1 = true)}>Open Modal 1 (Vertical Selects)</button>
  <button onclick={() => (show_modal_2 = true)}>Open Modal 2 (Horizontal Selects)</button>
</div>

{#if show_modal_1}
  <div
    class="modal-backdrop"
    onclick={(event) => {
      if (event.target === event.currentTarget) show_modal_1 = false
    }}
    onkeydown={(event) => {
      if (event.key === `Enter` || event.key === ` `) show_modal_1 = false
    }}
    role="button"
    tabindex="0"
  >
    <div
      class="modal-content modal-1"
      onkeydown={(event) => {
        if (event.key !== `Escape`) event.stopPropagation()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-1-title"
      tabindex="-1"
    >
      <h2 id="modal-1-title">Modal 1: Favorite Foods & Colors</h2>
      <MultiSelect
        bind:selected={selected_foods}
        options={foods_options}
        portal={{ active: true }}
        placeholder="Choose foods..."
      />
      <MultiSelect
        bind:selected={selected_colors}
        options={colors_options}
        portal={{ active: true }}
        placeholder="Choose colors..."
      />
      <p>Selected Foods: {selected_foods.map(get_label).join(`, `) || `None`}</p>
      <p>Selected Colors: {selected_colors.map(get_label).join(`, `) || `None`}</p>
      <button onclick={() => (show_modal_1 = false)}>Close Modal 1</button>
    </div>
  </div>
{/if}

{#if show_modal_2}
  <div
    class="modal-backdrop"
    onclick={(event) => {
      if (event.target === event.currentTarget) show_modal_2 = false
    }}
    onkeydown={(event) => {
      if (event.key === `Enter` || event.key === ` `) show_modal_2 = false
    }}
    role="button"
    tabindex="0"
  >
    <div
      class="modal-content modal-2"
      onkeydown={(event) => {
        if (event.key !== `Escape`) event.stopPropagation()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-2-title"
      tabindex="-1"
    >
      <h2 id="modal-2-title">Modal 2: Languages & Octicons (Horizontal)</h2>
      <div class="horizontal-selects">
        <MultiSelect
          bind:selected={selected_languages}
          options={languages}
          portal={{ active: true }}
          placeholder="Choose languages..."
        />
        <MultiSelect
          bind:selected={selected_octicons}
          options={octicons}
          portal={{ active: true }}
          placeholder="Choose octicons..."
        />
      </div>
      <p>Selected Languages: {selected_languages.map(get_label).join(`, `) || `None`}</p>
      <p>Selected Octicons: {selected_octicons.map(get_label).join(`, `) || `None`}</p>
      <button onclick={() => (show_modal_2 = false)}>Close Modal 2</button>
    </div>
  </div>
{/if}

<style>
  .button-bar {
    margin-bottom: 1.5em;
    display: flex;
    gap: 1em;
  }
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal-content {
    background-color: var(--modal-bg, #2d2d2d);
    color: var(--modal-text-color, #f0f0f0);
    padding: 10px 20px 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    max-width: 600px;
    max-height: 80vh;

    --sms-bg: #3a3a3a;
    --sms-text-color: #e0e0e0;
    --sms-border: 1pt solid #555;
    --sms-focus-border: 1pt solid #7799ff;
    --sms-placeholder-color: #aaa;
    --sms-selected-bg: #4a4a5a;
    --sms-selected-text-color: #f0f0f0;
    --sms-options-bg: #333;
    --sms-li-active-bg: #505060;
    --sms-li-selected-bg: #404050;
    --sms-li-selected-color: #e0e0e0;
    --sms-remove-btn-hover-color: #ff8f8f;
    --sms-disabled-bg: #4f4f4f;
    --sms-li-disabled-bg: #454545;
    --sms-li-disabled-text: #888;
  }
  .modal-content h2 {
    margin-top: 0;
  }

  .horizontal-selects {
    display: flex;
    gap: 1em;
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
