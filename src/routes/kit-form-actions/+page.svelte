<script lang="ts">
  import MultiSelect from '$lib'
  import ColorSlot from '$src/components/ColorSlot.svelte'
  import { colors } from '$src/options'
  import CollapsibleCode from '$src/components/CollapsibleCode.svelte'
  import type { ActionData, PageData } from './$types'
  import { repository } from '../../../package.json'
  import { page } from '$app/stores'

  export let form: ActionData
  export let data: PageData

  $: err_msg = {
    json: `The email field is required`,
    array: `The email field is required`,
    boring: `Boring answer!`,
  }[form?.error as string]
</script>

<p>
  This example shows the SvelteKit form action way of handling MultiSelect fields in form
  submission events. If you're not interested in
  <a href="https://kit.svelte.dev/docs/form-actions#progressive-enhancement">
    progressively enhanced forms
  </a>
  (i.e. supporting no-JS browsers) take a look at the
  <a href="/form">JS form example</a>
  instead.
</p>

<form method="POST" action="?/validate-form">
  <label for="colors">
    <strong>Which colors would you pick for the Martian flag?</strong>
  </label>
  <MultiSelect
    id="colors"
    options={colors}
    placeholder="Pick some colors..."
    name="colors"
    required
    invalid={!!form?.error}
    selected={form?.colors ?? [`Red`]}
  >
    <ColorSlot let:idx {idx} let:option {option} slot="selected" />
    <ColorSlot let:idx {idx} let:option {option} slot="option" />
  </MultiSelect>
  <button>Submit</button>
  <small>
    select some options, then click submit to see what data MultiSelect sends to a form
    submit handler
  </small>
  {#if err_msg}
    <p class="error">{err_msg}</p>
  {/if}
  {#if form?.success}
    <p class="success">
      Good answer! You entered
      {#each form.colors as color}
        <ColorSlot
          option={color}
          style="display: inline-flex; vertical-align: middle; margin: 0 0 0 1ex;"
        />
      {/each}
    </p>
  {/if}
</form>

{#each data.codes as [title, code]}
  {@const filepath = new URL(import.meta.url).pathname.replace(/\+page.+/, title)}
  <section>
    <strong>{title}</strong>
    <CollapsibleCode
      {code}
      language={title.endsWith(`.ts`) ? `typescript` : `html`}
      github_url="{repository}/blob/main{filepath}"
    />
  </section>
{/each}

<style>
  form {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 1ex 1em;
    border-radius: 3pt;
  }
  p {
    margin: 1em 0 1ex;
  }
  p.error {
    color: red;
  }
  p.success {
    width: max-content;
    padding: 1pt 6pt;
    box-sizing: border-box;
    color: lightgreen;
    border: 1px solid;
    border-radius: 3pt;
  }
  section {
    position: relative;
    margin: 1em 0;
    background-color: rgba(0, 255, 255, 0.1);
    padding: 1ex 1em;
    border-radius: 3pt;
  }
  section strong {
    padding: 0 6pt 0 0;
  }
</style>
