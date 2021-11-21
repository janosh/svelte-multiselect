<script>
  import Example from '../components/Example.svelte'
  import Toc from 'svelte-toc'
  import Docs from '../docs.svx'
  import GitHubCorner from '../components/GitHubCorner.svelte'
</script>

<Toc headingSelector="main :where(h2, h3, h4)" />

<GitHubCorner href="https://github.com/janosh/svelte-multiselect" />

<main>
  <h1>
    <img src="/favicon.svg" alt="Logo" height="60" style="vertical-align: -5px" />
    &nbsp;Svelte Multi-Select
  </h1>

  <a href="https://npmjs.com/package/svelte-multiselect">
    <img
      alt="NPM version"
      src="https://img.shields.io/npm/v/svelte-multiselect?color=blue&logo=NPM"
    />
  </a>

  <a href="https://app.netlify.com/sites/svelte-multiselect/deploys">
    <img
      alt="Netlify Status"
      src="https://api.netlify.com/api/v1/badges/a45b62c3-ea45-4cfd-9912-77ec4fc8d7e8/deploy-status"
    />
  </a>

  <a href="https://results.pre-commit.ci/latest/github/janosh/svelte-multiselect/main">
    <img
      alt="pre-commit.ci status"
      src="https://results.pre-commit.ci/badge/github/janosh/svelte-multiselect/main.svg"
    />
  </a>

  <Example />

  <Docs />
</main>

<style>
  h1 {
    font-size: calc(1em + 3vw);
  }
  :global(:root) {
    --toc-mobile-bg-color: #484452;
    --toc-mobile-btn-color: white;
    --toc-desktop-margin: 100px 0 0 0;
    --ghc-color: var(--night);
    --ghc-bg: white;
  }
</style>
