<script lang="ts">
  import { page } from '$app/stores'
  import Icon from '@iconify/svelte'
  import { onMount } from 'svelte'
  import { name } from '../../package.json'
  import CopyButton from './CopyButton.svelte'

  export let meta: Record<string, string>
  export let src: string // just here to avoid unknown prop warning
  src

  let node: HTMLElement

  onMount(() => {
    // replace $lib with package name in code
    node.innerHTML = node.innerHTML.replaceAll(`$lib`, name)
  })
  $: stackblitz_url = `https://stackblitz.com/github/janosh/svelte-multiselect?file=${encodeURIComponent(
    `src/routes${$page.url.pathname}/+page.svx`
  )}`
</script>

<div id={meta.id}>
  <slot name="example" />
  <div>
    <aside>
      <CopyButton content={node?.innerText} />
      <a href={stackblitz_url} class="btn" target="_blank" rel="noreferrer">
        <Icon icon="simple-icons:stackblitz" inline />
        Open in StackBlitz
      </a>
    </aside>
    <pre><code bind:this={node}><slot name="code" /></code></pre>
  </div>
</div>

<style>
  div {
    position: relative;
  }
  pre {
    margin-top: 2em;
    background-color: rgba(255, 255, 255, 0.05);
  }
  aside {
    position: absolute;
    top: 1em;
    right: 1em;
    display: flex;
    gap: 1ex;
    place-items: center;
  }
</style>
