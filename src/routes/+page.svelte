<script lang="ts">
  import { heading_anchors } from '$lib'
  import Readme from '$root/readme.md'
  import { DemoNav, Examples } from '$site'
  import { onMount } from 'svelte'

  interface Contributor {
    login: string
    avatar_url: string
    html_url: string
  }
  let contributors = $state<Contributor[]>([])

  onMount(() => {
    fetch(
      `https://api.github.com/repos/janosh/svelte-multiselect/contributors?per_page=100`,
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Contributor[]) => {
        contributors = data.filter((usr) => !usr.login.includes(`[bot]`))
      })
      .catch((error) => console.error(`Failed to fetch contributors:`, error))
  })
</script>

<main {@attach heading_anchors()}>
  <Readme>
    {#snippet examples()}
      <h2>📚 &thinsp; Demos</h2>
      <DemoNav menu_props={{ style: `justify-content: start !important` }} />
      <Examples />
    {/snippet}
  </Readme>

  {#if contributors.length > 0}
    <section class="contributors">
      <h2 style="margin-bottom: 0.3rem">👏 &thinsp; Contributors</h2>
      <p style="color: var(--text-muted); margin-bottom: 1.5rem">
        Thanks to all who helped make this project better!
      </p>
      <ul>
        {#each contributors as { login, avatar_url, html_url } (login)}
          <li>
            <a href={html_url} target="_blank" rel="noreferrer">
              <img
                src="{avatar_url}&s=100"
                alt={login}
                loading="lazy"
              />
              <span style="font-size: 0.75rem; opacity: 0.7">{login}</span>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
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
  section.contributors {
    max-width: 50em;
    margin: 3rem auto;
    text-align: center;
    ul {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1.2rem;
      list-style: none;
      padding: 0;
    }
    li a {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s;
      &:hover {
        transform: translateY(-3px);
      }
    }
    img {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      outline: 2px solid var(--border);
      outline-offset: -2px;
      transition: outline-color 0.2s;
      &:hover {
        outline-color: cornflowerblue;
      }
    }
  }
</style>
