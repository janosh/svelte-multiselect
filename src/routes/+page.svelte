<script lang="ts">
  import Toc from 'svelte-toc'
  import Readme from '../../readme.md'
  import Examples from '../components/Examples.svelte'
  import { demo_routes } from './+layout'
</script>

<main>
  <Readme>
    <Examples slot="examples" />
    <svelte:fragment slot="nav">
      <h2>More examples</h2>
      <nav>
        {#each demo_routes as route, idx}
          {#if idx > 0}<strong>&bull;</strong>{/if}
          <a href={route}>{route}</a>
        {/each}
      </nav>
    </svelte:fragment>
  </Readme>
</main>

<Toc headingSelector="main > :where(h2, h3)" breakpoint={1250} />

<style>
  nav {
    display: flex;
    gap: 1ex;
    flex-wrap: wrap;
  }
  nav a {
    padding: 1pt 4pt;
    background-color: rgba(255, 255, 255, 0.125);
    border-radius: 3pt;
  }
  @media (max-width: 600px) {
    :global(h1[align='center']) {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  }
  :global(.hide-in-docs) {
    display: none;
  }
  :global(aside.toc.desktop) {
    position: fixed;
    top: 3em;
    left: calc(50vw + 50em / 2);
    max-width: 16em;
  }
</style>
