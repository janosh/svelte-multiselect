<script lang="ts">
  import MultiSelect, { Option, Primitive } from '../lib'
  import Confetti from './Confetti.svelte'
  import { mlFrameworks, webFrameworks } from './frameworks'

  let selectedWeb: Primitive[]
  let activeWeb: Option
  let selectedML: Option[]

  // used to show user hint to try arrow keys but only once
  let neverActive = true
  let showConfetti = false
  $: if (activeWeb) neverActive = false

  const placeholder = `Take your pick...`
  const filterFunc = (op: Option, searchText: string) => {
    if (!searchText) return true
    if (op.stack && `${op.stack}`.toLowerCase().includes(searchText.toLowerCase())) {
      return true
    }
    return `${op.label}`.toLowerCase().includes(searchText.toLowerCase())
  }
</script>

<section>
  <h3>Multi Select</h3>

  <p>Favorite Web Frameworks?</p>

  <pre><code>selected = {JSON.stringify(selectedWeb)}</code></pre>

  <MultiSelect
    options={webFrameworks}
    bind:selectedLabels={selectedWeb}
    bind:activeOption={activeWeb}
    maxSelect={4}
    {placeholder}
    {filterFunc}
  />
</section>

<section>
  <h3>Single Select</h3>

  <p>Favorite Machine Learning Framework?</p>

  <pre><code>selected = {JSON.stringify(selectedML)}</code></pre>

  <MultiSelect
    maxSelect={1}
    options={mlFrameworks}
    bind:selected={selectedML}
    {placeholder}
  />
</section>

<section>
  <h3>50/50 Chance of Confetti</h3>

  <p>Favorite Web Frameworks?</p>

  <MultiSelect
    options={[`React`, `Svelte`]}
    maxSelect={1}
    {placeholder}
    on:add={(e) => {
      if (e.detail.option.label === `Svelte`) {
        showConfetti = true
        setTimeout(() => (showConfetti = false), 4000)
      }
    }}
  />
  {#if showConfetti}
    <Confetti />
  {/if}
</section>

<section>
  <h3>Slot Components</h3>

  <p>as custom renderers for Options and/or Selected</p>

  <MultiSelect
    options={[`Banana`, `Watermelon`, `Apple`, `Dates`, `Mango`]}
    {placeholder}
  >
    <span let:idx let:option slot="renderOptions">
      {idx + 1}. {option.label}
      {option.label === `Mango` ? `🎉` : ``}
    </span>
    <span let:idx let:option slot="renderSelected">
      #{idx + 1}
      {option.label}
    </span>
  </MultiSelect>
  {#if showConfetti}
    <Confetti />
  {/if}
</section>

<style>
  :root {
    --sms-active-color: var(--blue);
    --sms-options-bg: black;
  }
  section {
    margin-top: 2em;
    background-color: #28154b;
    border-radius: 1ex;
    padding: 1pt 1.4ex;
  }
  pre {
    white-space: pre-wrap;
  }
</style>
