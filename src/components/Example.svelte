<script lang="ts">
  import MultiSelect from '../lib'
  import { webFrameworks, mlFrameworks } from './frameworks'

  let selectedWeb: string[]
  let selectedML = `PyTorch`

  const placeholder = `Take your pick...`
  const disabledOptions = [`Torch`, `CNTK`]
</script>

<section>
  <div>
    <h3>Multi Select</h3>

    <p>Favorite Web Frameworks?</p>

    <pre><code>selected = {JSON.stringify(selectedWeb)}</code></pre>

    <MultiSelect
      options={webFrameworks}
      bind:selected={selectedWeb}
      {placeholder}
      --sms-active-color="var(--blue)"
      --sms-options-bg="black" />
  </div>
  <div>
    <h3>Single Select</h3>

    <p>Favorite Machine Learning Framework?</p>

    <pre><code>selected = {JSON.stringify(selectedML)}</code></pre>

    <MultiSelect
      maxSelect={1}
      options={mlFrameworks}
      bind:selected={selectedML}
      {placeholder}
      {disabledOptions}
      --sms-active-color="var(--blue)"
      --sms-options-bg="black" />
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
    padding: 0 1.4ex;
    flex-shrink: 1;
  }
  pre {
    white-space: pre-wrap;
  }
  @media (max-width: 600px) {
    section {
      flex-direction: column;
    }
  }
</style>
