<script lang="ts">
  import Toc from 'svelte-toc'
  import Readme from '../../readme.md'
  import Examples from '../components/Examples.svelte'

  const routes = Object.keys(import.meta.glob(`./demos/*.svx`)).map(
    (filename) => filename.split(`.`)[1]
  )
</script>

<main>
  <Readme>
    <Examples slot="examples" />
    <svelte:fragment slot="nav">
      <h2>More examples</h2>
      <nav>
        {#each routes as route, idx}
          {#if idx > 0}<strong>&bull;</strong>{/if}
          <a href={route}>/{route.split(`/`).at(-1)}</a>
        {/each}
      </nav>
    </svelte:fragment>
  </Readme>
</main>

<Toc headingSelector="main > :where(h2, h3)" />

<style>
  nav {
    display: flex;
    gap: 1ex;
  }
  :global(.hide-in-docs) {
    display: none;
  }
</style>
