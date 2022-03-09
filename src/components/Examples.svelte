<script lang="ts">
  import MultiSelect, { Option, Primitive } from '../lib'
  import Confetti from './Confetti.svelte'
  import { colors, ml_libs, web_ui_libs } from '../options'
  import ColorSlot from './ColorSlot.svelte'

  let selectedWeb: Primitive[]
  let activeWeb: Option
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

  <label for="fav-web-tool">Favorite Web Frameworks?</label>

  <pre><code>selectedLabels = {JSON.stringify(selectedWeb)}</code></pre>

  <MultiSelect
    id="fav-web-tool"
    options={web_ui_libs}
    bind:selectedLabels={selectedWeb}
    bind:activeOption={activeWeb}
    maxSelect={6}
    {placeholder}
    {filterFunc}
  />
</section>

<section>
  <h3>Single Select</h3>

  <label for="fav-ml-tool">Favorite Machine Learning Framework?</label>

  <pre><code>selected = {JSON.stringify(selectedML)}</code></pre>

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
  <h3>50/50 Chance of Confetti</h3>

  <label for="confetti-select">Favorite Web Framework?</label>

  <MultiSelect
    id="confetti-select"
    options={[`React`, `Svelte`]}
    maxSelect={1}
    {placeholder}
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
    background-color: transparent;
  }
</style>
