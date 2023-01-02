<script lang="ts">
  import Icon from '@iconify/svelte'
  import hljs from 'highlight.js/lib/common'
  import 'highlight.js/styles/vs2015.css'
  import { tweened } from 'svelte/motion'
  import CopyButton from './CopyButton.svelte'

  export let duration: number = 200
  export let open: boolean = false
  export let code: string
  export let repl_url: string = ``
  export let github_url: string = ``
  export let style: string | null = null
  export let language = `html`

  const angle = tweened(180, { duration })

  function toggle() {
    open = !open
    angle.set(open ? 0 : 180)
  }
</script>

<nav {style}>
  <slot name="title" />
  <button on:click={toggle}>
    <span style="display: inline-block; transform: rotate({$angle}deg);">👆</span>
    {open ? `Close` : `View code`}
  </button>

  {#if repl_url}
    <a href={repl_url} target="_blank" rel="noreferrer">
      <Icon icon="carbon:logo-svelte" inline />
      REPL
    </a>
  {/if}

  {#if github_url}
    <a href={github_url} target="_blank" rel="noreferrer">
      <Icon icon="octicon:mark-github" inline />
      &thinsp;GitHub
    </a>
  {/if}
</nav>

<div class:open>
  <aside>
    <CopyButton content={code} />
  </aside>
  <pre><code>{@html hljs.highlight(code.trim(), { language }).value}</code></pre>
</div>

<style>
  nav {
    top: 8pt;
    right: 1em;
    display: inline-flex;
    gap: 1ex;
    line-height: 1;
  }
  a,
  button {
    background: rgba(0, 0, 0, 0.3);
    padding: 4pt 1ex;
    transition: 0.3s;
    border-radius: 3pt;
    color: var(--text-color);
  }
  :is(a, button):hover {
    background: rgba(255, 255, 255, 0.4);
  }
  div {
    position: relative;
    visibility: hidden;
    opacity: 0;
    max-height: 0;
    transition: max-height 0.3s, opacity 0.3s, visibility 0.3s;
  }
  div.open {
    visibility: visible;
    opacity: 1;
    max-height: 9999vh;
  }
  aside {
    position: absolute;
    top: 1em;
    right: 1em;
    display: flex;
    gap: 1em;
  }
</style>
