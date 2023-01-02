<script lang="ts">
  import { page } from '$app/stores'
  import Icon from '@iconify/svelte'

  export let repl: string | null = null
  export let github: string | boolean | null = null
  export let stackblitz: string | boolean | null = null

  const stackblitz_url = `https://stackblitz.com/github/janosh/svelte-multiselect`
  const github_url = `https://github.com/janosh/svelte-multiselect/blob/main`
  const links = { target: `_blank`, rel: `noreferrer`, class: `btn` }
  $: serving_file = `src/routes${$page.url.pathname}/+page.svx`
</script>

{#if repl}
  <a href={repl} {...links}>
    <Icon icon="carbon:logo-svelte" inline />
    REPL
  </a>
{/if}

{#if github}
  {@const file = github == true ? serving_file : github}
  <a href="{github_url}/{file}" {...links}>
    <Icon icon="octicon:mark-github" inline />
    &thinsp;GitHub
  </a>
{/if}

{#if stackblitz}
  <!-- file param defaults to path of file serving the current page if stackblitz=true -->
  {@const file = encodeURIComponent(stackblitz == true ? serving_file : stackblitz)}
  <a href="{stackblitz_url}?file={file}" {...links}>
    <Icon icon="simple-icons:stackblitz" inline />
    StackBlitz
  </a>
{/if}
