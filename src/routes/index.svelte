<script lang="ts">
  import GitHubCorner from 'svelte-github-corner'
  import Toc from 'svelte-toc'
  import Readme from '../../readme.md'
  import Examples from '../components/Examples.svelte'

  export let routes: string[]
</script>

<GitHubCorner href="https://github.com/janosh/svelte-multiselect" />

<main>
  <Readme>
    <Examples slot="examples" />
    <svelte:fragment slot="nav">
      <h2>More examples</h2>
      <nav>
        {#each routes as route, idx}
          {#if idx > 0}<strong>&bull;</strong>{/if}
          <a href={route}>{route}</a>
        {/each}
      </nav>
    </svelte:fragment>
  </Readme>
</main>
<Toc headingSelector="main > :where(h2, h3)" />

<style>
  :global(h1) {
    display: flex;
    font-size: clamp(2rem, 2rem + 2vw, 3rem);
    place-items: center;
    place-content: center;
    margin: 1.2em 0;
  }
  /* outer div = hydration target */
  :global(body > div) {
    display: flex;
    margin: auto;
    max-width: 1100px;
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
  nav {
    display: flex;
    gap: 1ex;
  }
</style>
