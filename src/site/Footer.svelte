<script>
  import { repository } from '$root/package.json'
</script>

<footer>
  <a href="{repository}/discussions/200">
    <svg><use href="#material-symbols-auto-awesome" /></svg>
    Multiselect Showcase
  </a>
  <a href="{repository}/blob/-/src/routes/(demos)/+layout.svelte">
    <svg><use href="#carbon-edit" /></svg>
    Edit this page
  </a>
  <small title="For keyboad-only site navigation">
    Use <kbd>cmd+k</kbd> to bring up a nav palette.
  </small>
</footer>

<style>
  footer {
    padding: 3vh 3vw;
    background: #00061a;
    text-align: center;
  }
  footer > a {
    margin: 0 0 0 4pt;
  }
  small {
    margin: 1em;
    display: block;
  }
  small kbd {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 1pt 3pt;
    font-size: larger;
    border-radius: 2pt;
  }
</style>
