<script lang="ts">
  import MultiSelect, { Option, Primitive } from '../lib'
  import { mlFrameworks, webFrameworks } from './frameworks'

  let selectedWeb: Primitive[]
  let activeWeb: Option
  let selectedML: Option[]

  // used to show user hint to try arrow keys but only once
  let neverActive = true
  $: if (activeWeb) neverActive = false

  const placeholder = `Take your pick...`
</script>

<section>
  <h3>Multi Select</h3>

  <p>Favorite Web Frameworks?</p>

  <pre>
    <code>selected = {JSON.stringify(selectedWeb)}</code>
  </pre>
  <pre>
    <code>
      {#if activeWeb?.label}
        activeOption.label = '{activeWeb.label}'
      {:else}
        activeOption = {activeWeb}
      {/if} {#if neverActive}
        // Use up/down arrow keys to make an option active
      {/if}
    </code>
  </pre>

  <MultiSelect
    options={webFrameworks}
    bind:selectedLabels={selectedWeb}
    bind:activeOption={activeWeb}
    maxSelect={4}
    {placeholder}
    --sms-active-color="var(--blue)"
    --sms-options-bg="black"
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
    --sms-active-color="var(--blue)"
    --sms-options-bg="black"
  />
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
  }
</style>
