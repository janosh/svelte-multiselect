<script lang="ts">
  import { onMount } from 'svelte'
  import { name } from '../../package.json'
  import CopyButton from './CopyButton.svelte'

  export let src: string // just here to avoid unknown prop warning
  export let meta: Record<string, string>
  let node: HTMLElement

  src
  $: ({ id } = meta)

  onMount(() => {
    // replace $lib with 'name' in code
    node.innerHTML = node.innerHTML.replace(/\$lib/g, name)
  })
</script>

{#if id}
  <div {id}>
    <slot name="example" />
  </div>
{:else}
  <slot name="example" />
{/if}

<pre><aside>
  <CopyButton content={node?.innerText} />
</aside><code bind:this={node}><slot name="code" /></code></pre>

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
