<script lang="ts">
  // see svelte.config.js where this component is passed to mdsvexamples
  import Icon from '@iconify/svelte'
  import { onMount } from 'svelte'
  import { name } from '../../package.json'
  import CodeLinks from './CodeLinks.svelte'
  import CopyButton from './CopyButton.svelte'

  // src+meta are passed in by mdsvexamples
  export let src: string // code fence content
  export let meta: {
    // code fence metadata
    collapsible?: boolean
    id?: string
    repl?: string
    github?: string
    stackblitz?: string | boolean
  }

  export let duration: number = 200
  export let open: boolean = !meta.collapsible

  let node: HTMLElement // the <code> element

  onMount(() => {
    // replace $lib with package name in code
    node.innerHTML = node.innerHTML?.replaceAll(`$lib`, name)
  })
</script>

<!-- wrap in div with id for precise CSS selectors in playwright E2E tests -->
<div id={meta.id}>
  <slot name="example" />
  {#if meta.collapsible}
    <nav>
      <CodeLinks {...meta} />
      <slot name="title" />
      <button on:click={() => (open = !open)}>
        <Icon icon="carbon:chevron-{open ? `up` : `down`}" inline />
        {open ? `Close` : `View code`}
      </button>
    </nav>
  {/if}

  <div class="collapsible" class:open>
    <aside>
      <CopyButton content={src} />
      {#if !meta.collapsible}
        <CodeLinks {...meta} />
      {/if}
    </aside>
    <pre><code bind:this={node}><slot name="code" /></code></pre>
  </div>
</div>

<style>
  pre {
    margin-top: 2em;
  }
  aside {
    position: absolute;
    top: 1em;
    right: 1em;
    display: flex;
    gap: 1ex;
  }

  div.collapsible {
    position: relative;
    visibility: hidden;
    opacity: 0;
    max-height: 0;
    transition: max-height 0.3s, opacity 0.3s, visibility 0.3s;
  }
  div.collapsible.open {
    visibility: visible;
    opacity: 1;
    max-height: 9999vh;
  }
  nav {
    display: flex;
    gap: 1ex;
  }
  nav > button {
    line-height: 15pt;
  }
</style>
