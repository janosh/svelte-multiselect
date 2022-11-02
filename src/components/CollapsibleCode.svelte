<script lang="ts">
  import Icon from '@iconify/svelte'
  import hljs from 'highlight.js/lib/common'
  import 'highlight.js/styles/vs2015.css'
  import { tweened } from 'svelte/motion'
  import { slide } from 'svelte/transition'

  export let duration: number = 200
  export let open: boolean = false
  export let code: string
  export let repl_url: string = ``

  const angle = tweened(180, { duration })

  function toggle() {
    open = !open
    angle.set(open ? 0 : 180)
  }
</script>

<nav>
  <button on:click={toggle}>
    {open ? `Close` : `View code`}
    <span style="display: inline-block; transform: rotate({$angle}deg);">👆</span>
  </button>

  {#if repl_url}
    <a href={repl_url} target="_blank" rel="noreferrer">
      <Icon icon="carbon:logo-svelte" inline />
      REPL
    </a>
  {/if}
</nav>

{#if open}
  <div transition:slide={{ duration }}>
    <pre><code>{@html hljs.highlight(code.trim(), { language: `html` }).value}</code
      ></pre>
  </div>
{/if}

<style>
  nav {
    position: absolute;
    top: 8pt;
    right: 1em;
    display: flex;
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
</style>
