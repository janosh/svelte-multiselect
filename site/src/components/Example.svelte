<script>
  import MultiSelect from '../../../package/MultiSelect.svelte'
  import { webFrameworks, mlFrameworks } from './frameworks'

  const placeholder = `Take your pick...`
  let selectedWeb, selectedML
</script>

<section>
  <div>
    <h3>Multi Select</h3>

    <p>Favorite Web Frameworks?</p>

    {#if selectedWeb?.length > 0}
      <pre><code>selected = {JSON.stringify(selectedWeb)}</code></pre>
    {/if}

    <MultiSelect {placeholder} options={webFrameworks} bind:selected={selectedWeb} />
  </div>
  <div>
    <h3>Single Select</h3>

    <p>Favorite Machine Learning Framework?</p>

    {#if selectedML?.length > 0}
      <pre><code>selected = {JSON.stringify(selectedML)}</code></pre>
    {/if}

    <MultiSelect single {placeholder} options={mlFrameworks} bind:selected={selectedML} />
  </div>
</section>

<style>
  section {
    display: flex;
    gap: 1em;
  }
  section div {
    flex: 1;
    background-color: #211734;
    border-radius: 1ex;
    padding: 0 1em;
    height: max-content;
  }
  pre {
    white-space: pre-wrap;
  }
  @media (max-width: 600px) {
    section {
      display: contents;
    }
  }
  :global(.multiselect ul) {
    /* dropdown options */
    background: black !important;
  }
</style>
