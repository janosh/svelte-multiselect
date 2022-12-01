<script>
  import { onMount } from 'svelte'
  import { name } from '../../package.json'
  import CopyButton from './CopyButton.svelte'

  let code

  // replace $lib with 'name' in code
  onMount(() => {
    code.innerHTML = code.innerHTML.replace(/\$lib/g, name)
  })
</script>

<slot name="example" />

<pre><aside>
  <CopyButton content={code} />
</aside><code bind:this={code}><slot name="code" /></code></pre>

<style>
  pre {
    margin-top: 2em;
    background-color: rgba(255, 255, 255, 0.05);
    position: relative;
  }
  aside {
    position: absolute;
    top: 1em;
    right: 1em;
    display: flex;
    gap: 1em;
  }
</style>
