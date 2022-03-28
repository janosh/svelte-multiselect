<script lang="ts">
  import MultiSelect, { Option, Primitive } from '../lib'
  import Confetti from './Confetti.svelte'
  import { colors, ml_libs, languages, frontend_libs } from '../options'
  import ColorSlot from './ColorSlot.svelte'
  import LanguageSlot from './LanguageSlot.svelte'

  let selectedLangs: Primitive[]
  let selectedML: Option[]
  let selectedFruit: Option[]

  let showConfetti = false

  const placeholder = `Take your pick...`
  const filterFunc = (op: Option, searchText: string) => {
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

  <pre>bind:selectedLabels = {JSON.stringify(selectedLangs)}</pre>

  <label for="languages">Favorite programming languages?</label>

  <MultiSelect
    id="languages"
    options={languages}
    {placeholder}
    bind:selectedLabels={selectedLangs}
  >
    <LanguageSlot let:option {option} slot="selected" />
  </MultiSelect>
</section>

<section>
  <h3>Single Select</h3>

  <label for="fav-ml-tool">Favorite Machine Learning Framework?</label>

  <pre>selected = {JSON.stringify(selectedML)}</pre>

  <MultiSelect
    id="fav-ml-tool"
    maxSelect={1}
    maxSelectMsg={(current, max) => `${current} of ${max} selected`}
    options={ml_libs}
    bind:selected={selectedML}
    bind:searchText
    {placeholder}
    {loading}
  />
</section>

<section>
  <h3>Chance of Confetti</h3>

  <label for="confetti-select">Favorite Web Framework?</label>

  <MultiSelect
    id="confetti-select"
    options={frontend_libs}
    maxSelect={1}
    {placeholder}
    {filterFunc}
    on:add={(e) => {
      if (e.detail.option.label === `Svelte`) {
        showConfetti = true
        setTimeout(() => (showConfetti = false), 3000)
      }
    }}
  >
    <LanguageSlot let:option {option} slot="selected" />
  </MultiSelect>
  {#if showConfetti}
    <Confetti />
  {/if}
</section>

<section>
  <h3>Slot Components</h3>

  <label for="fruit-select">Custom renderers for options and/or selected items</label>

  <form
    on:submit|preventDefault={() => {
      alert(`You selected '${selectedFruit.map((el) => el.label).join(`, `)}'`)
    }}
  >
    <MultiSelect
      id="color-select"
      options={colors}
      bind:selected={selectedFruit}
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
