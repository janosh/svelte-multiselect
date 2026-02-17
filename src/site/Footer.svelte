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
    <kbd>cmd+k</kbd> to open nav palette.
  </small>
</footer>

<style>
  footer {
    padding: 2em;
    margin-top: auto;
    width: calc(100% + 2 * var(--page-pad));
    position: relative;
    left: calc(-1 * var(--page-pad));
    box-sizing: border-box;
    background: var(--surface);
    text-align: center;
  }
  footer > a {
    margin: 0 0.5em;
  }
  small {
    margin-top: 1em;
    display: block;
    color: var(--text-muted);
  }
  kbd {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 0.1em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }
</style>
