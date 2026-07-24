<script lang="ts">
  import { browser } from '$app/environment'
  import { afterNavigate, goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { page } from '$app/state'
  import { CopyButton, GitHubCorner, PageSearch, slug_to_title } from '$lib'
  import { highlight_matches } from '$lib/attachments'
  import type { PageSearchNavigateDetails } from '$lib/types'
  import { name, repository } from '$root/package.json'
  import { DemoNav, Footer } from '$site'
  import favicon from '$site/favicon.svg'
  import type { Snippet } from 'svelte'
  import { Toc } from 'svelte-toc'
  // eslint-disable-next-line import/no-unassigned-import -- global route styles
  import '../app.css'
  import { routes } from './(demos)'

  let { children }: { children?: Snippet<[]> } = $props()
  let toc_desktop = $state(true)
  let page_search_query = $state(``)

  const actions = routes.map(({ route }) => ({
    label: route,
    action: () => goto(`${base}${route}`),
  }))
  const is_home = $derived(page.route.id === `/`)
  const page_title = $derived.by(() => {
    const route_slug = page.url.pathname
      .split(`/`)
      .findLast(Boolean)
      ?.replace(/\.html$/, ``)
    return is_home || !route_slug ? `Svelte MultiSelect` : slug_to_title(route_slug)
  })
  const navigate_from_page_search = async (
    url: string,
    { query }: PageSearchNavigateDetails,
  ) => {
    await goto(url)
    page_search_query = ``
    queueMicrotask(() => (page_search_query = query))
  }

  afterNavigate(() => (page_search_query = ``))

  if (browser) {
    const saved_theme = localStorage.getItem(`theme`)
    let effective_theme = saved_theme
    if (effective_theme !== `light` && effective_theme !== `dark`) {
      effective_theme = matchMedia(`(prefers-color-scheme: dark)`).matches
        ? `dark`
        : `light`
    }
    document.documentElement.style.colorScheme = effective_theme
    document.documentElement.dataset.theme = effective_theme
  }
</script>

<svelte:head>
  <title>{page_title}</title>
  <meta data-pagefind-meta="title[content]" content={page_title} />
  <link rel="icon" href={favicon} />
</svelte:head>

{#if !is_home}
  <h1>
    <img src={favicon} alt={name} height="50" width="50" />&ensp;Svelte MultiSelect
  </h1>
  <DemoNav --nav-item-padding="1pt 4pt" />
{/if}

<PageSearch
  fallback_actions={actions}
  navigate={navigate_from_page_search}
  strip_html_suffix
  pagefind_path={`${base}/pagefind/pagefind.js`}
/>

<GitHubCorner href={repository} />

<CopyButton global global_selector="pre:not(li > pre) > code" />

<div
  data-pagefind-body
  style="display: contents"
  {@attach highlight_matches({
    query: page_search_query,
    css_class: `page-search-match`,
    duration_ms: 8000,
  })}
>
  {@render children?.()}
</div>

{#if is_home}
  <Toc
    headingSelector="main > :where(h2, h3)"
    breakpoint={1500}
    bind:desktop={toc_desktop}
    asideProps={{
      style: toc_desktop
        ? `position: fixed; right: 2em; font-size: 0.7rem; max-width: 17rem;`
        : ``,
    }}
    openButtonProps={{ style: `display: flex; padding: 3px;` }}
    --toc-mobile-bg="light-dark(#fff, #222226)"
    --toc-padding="1em 0 1em 1em"
    --toc-active-color="var(--accent)"
  />
{/if}

<Footer />

<style>
  :global(::highlight(page-search-match)) {
    background: var(--page-search-highlight-bg, light-dark(#ffe07a, #806300));
    color: var(--page-search-highlight-color, light-dark(#513a00, #fff3ba));
  }
</style>
