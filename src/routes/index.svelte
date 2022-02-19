<script>
  import GitHubCorner from 'svelte-github-corner'
  import Toc from 'svelte-toc'
  import Readme from '../../readme.md'
  import Example from '../components/Example.svelte'
</script>

<Toc headingSelector="main > :where(h2, h3)" />

<GitHubCorner href="https://github.com/janosh/svelte-multiselect" />

<main>
  <Readme>
    <Example />
  </Readme>
</main>

<style>
  :global(h1) {
    display: flex;
    font-size: clamp(2rem, 2rem + 2vw, 3rem);
    place-items: center;
    place-content: center;
    margin: 1.2em 0;
  }
  :global(h1 br) {
    display: none;
  }
  @media (max-width: 600px) {
    :global(h1) {
      flex-direction: column;
      gap: 1ex;
    }
  }
  :global(.hide-in-docs) {
    display: none;
  }
  :global(:root) {
    --toc-mobile-bg: #1c0e3e;
    --toc-mobile-btn-color: white;
    --toc-desktop-margin: 100px 0 0 0;
    --ghc-color: var(--night);
    --ghc-bg: white;
  }
</style>
