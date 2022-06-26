<script lang="ts">
  import MultiSelect, { ObjectOption } from '../lib'
  import { colors, frontend_libs, languages, ml_libs } from '../options'
  import { language_store } from '../stores'
  import ColorSlot from './ColorSlot.svelte'
  import Confetti from './Confetti.svelte'
  import LanguageSlot from './LanguageSlot.svelte'

  let selected_ml: string[]
  let selected_colors: ObjectOption[]

  let showConfetti = false

  const filterFunc = (op: ObjectOption, searchText: string) => {
    if (!searchText) return true
    const [label, lang, searchStr] = [op.label, op.lang, searchText].map((s) =>
      `${s}`.toLowerCase()
    )
    return label.includes(searchStr) || lang.includes(searchStr)
  }

  let loading = false
  let searchText = ``
  $: if (searchText) {
    loading = true
    setTimeout(() => (loading = false), 1000)
  }
</script>

<section>
  <h3>Multi Select</h3>

  <pre>bind:selectedLabels = {JSON.stringify($language_store)}</pre>

  <label for="languages">Favorite programming languages?</label>

  <MultiSelect
    id="languages"
    options={languages}
    placeholder="Take your pick..."
    bind:selected={$language_store}
  >
    <LanguageSlot let:option {option} slot="selected" />
    <LanguageSlot let:option {option} slot="option" />
  </MultiSelect>
</section>

<section>
  <h3>Single Select</h3>

  <label for="fav-ml-tool">with loading indicator on text input</label>

  <pre>selected = {JSON.stringify(selected_ml)}</pre>

  <MultiSelect
    id="fav-ml-tool"
    maxSelect={1}
    maxSelectMsg={(current, max) => `${current} of ${max} selected`}
    options={ml_libs}
    bind:selectedLabels={selected_ml}
    bind:searchText
    placeholder="Favorite machine learning framework?"
    {loading}
  />
</section>

<section>
  <h3>Chance of Confetti</h3>

  <label for="confetti-select">Callback on item selection</label>

  <MultiSelect
    id="confetti-select"
    options={frontend_libs}
    maxSelect={4}
    placeholder="Favorite web framework?"
    {filterFunc}
    on:add={(e) => {
      if (e.detail.option.label === `Svelte`) {
        showConfetti = true
        setTimeout(() => (showConfetti = false), 3000)
      }
    }}
  />
  {#if showConfetti}
    <Confetti />
  {/if}
</section>

<section>
  <h3>Slot Components</h3>

  <label for="food-select">Custom renderers for options and/or selected items</label>

  <form
    on:submit|preventDefault={() => {
      alert(`You selected '${selected_colors.map((el) => el.label).join(`, `)}'`)
    }}
  >
    <MultiSelect
      id="color-select"
      options={colors}
      bind:selected={selected_colors}
      placeholder="Pick some colors..."
      allowUserOptions="append"
      required
    >
      <ColorSlot let:idx {idx} let:option {option} slot="selected" />
      <ColorSlot let:idx {idx} let:option {option} slot="option" />
    </MultiSelect>
    <button style="border: none; border-radius: 2pt; margin: 5pt 5pt 8pt 0;">
      submit
    </button> (form submission will abort if Multiselect is empty)
  </form>
</section>

<style>
  section {
    margin-top: 2em;
    background-color: #28154b;
    border-radius: 1ex;
    padding: 1pt 1.4ex;
  }
  pre {
    white-space: pre-wrap;
    padding: 7pt 1em;
    font-size: 1em;
    word-break: break-word;
  }
</style>
