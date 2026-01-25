<script lang="ts">
  // see svelte.config.js where this component is passed to live-examples remark plugin
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import Icon from './Icon.svelte'

  let {
    src = ``,
    meta = {},
    open = $bindable(!meta.collapsible),
    title,
    example,
    code,
    link_props, // Applied after computed attributes (href, title, etc.), allowing override
    button_props,
  }: {
    // src+meta are passed in by live-examples remark plugin
    src?: string // code fence content, sadly without indentation so we prefer node?.innerText below
    meta?: { // code fence metadata
      collapsible?: boolean // whether to show a button to expand/collapse the code
      code_above?: boolean // whether to show the code above the example, default is below
      id?: string // id of the <div> wrapping the code and example (e.g. to write very specific testing selectors)
      repl?: string // Svelte REPL URL
      github?: string | boolean // GitHub URL or true to link to the file serving the current page
      repo?: string // GitHub repo URL
      Wrapper?: string // Svelte component to wrap the example
      example?: boolean
      file?: string
    }
    open?: boolean
    title?: Snippet<[]>
    example?: Snippet<[]>
    code?: Snippet<[]>
    link_props?: HTMLAttributes<HTMLAnchorElement>
    button_props?: HTMLAttributes<HTMLButtonElement>
  } = $props()

  let { id, collapsible, code_above, repl, github, repo, file } = $derived(meta)
  const links = { target: `_blank`, rel: `noreferrer` }
</script>

<nav>
  {#each [
      { cond: repl, href: repl, icon: `Svelte` },
      {
        cond: github && repo,
        href: file ? `${repo}/blob/-/${github == true ? file : github}` : repo,
        icon: `GitHub`,
      },
    ] as const as
    { cond, href, icon }
    (icon)
  }
    <a
      {href}
      {...links}
      title={icon}
      style:display={cond ? `inline-block` : `none`}
      {...link_props}
    >
      <Icon {icon} />
    </a>
  {/each}
  {#if collapsible}
    {@render title?.()}
    <button onclick={() => (open = !open)} {...button_props}>
      <Icon icon={open ? `Collapse` : `Expand`} />
      {open ? `Close` : `View code`}
    </button>
  {/if}
</nav>
<!-- wrap in div with id for precise CSS selectors in playwright E2E tests -->
<div {id} class="code-example">
  {#if !code_above}
    {@render example?.()}
  {/if}

  <pre class:open><code>{#if code}{@render code()}{:else}{src}{/if}</code></pre>

  {#if code_above}
    {@render example?.()}
  {/if}
</div>

<style>
  div.code-example {
    margin: var(--code-example-margin, 1em auto);
    position: relative;
  }
  nav {
    display: flex;
    justify-content: end;
    align-items: center;
    margin: var(--code-example-nav-margin, initial);
    gap: var(--code-example-nav-gap, 1ex);
  }
  pre code {
    background-color: transparent;
    display: inline-block;
  }
  pre {
    position: relative;
    overflow-x: auto;
    visibility: hidden;
    opacity: 0;
    max-height: 0;
    transition: max-height, opacity, visibility;
    transition-duration: var(--code-example-pre-transition-duration, 0.3s);
    border-radius: var(--code-example-pre-border-radius, 4pt);
    background-color: var(--code-example-pre-bg, var(--pre-bg));
    padding: var(--code-example-pre-padding, 1ex 1em);
  }
  pre.open {
    visibility: visible;
    opacity: 1;
    max-height: 9999vh;
    margin: var(--code-example-pre-margin, 1em 0 0 0);
  }
</style>
