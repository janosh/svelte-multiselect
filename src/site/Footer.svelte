<script>
  import { repository } from '$root/package.json'
  import Icon from '@iconify/svelte'
</script>

<footer>
  <a href="{repository}/discussions/200">
    <Icon icon="material-symbols:auto-awesome" inline />
    Multiselect Showcase
  </a>
  <a href="{repository}/blob/-/src/routes/(demos)/+layout.svelte">
    <Icon icon="carbon:edit" inline />
    Edit this page
  </a>
</footer>
<small>Use <kbd>cmd+k</kbd> to bring up a nav palette.</small>

<style>
  footer {
    display: flex;
    margin: 2em;
    gap: 15pt;
    place-content: center;
    flex-wrap: wrap;
  }
  small {
    text-align: center;
    display: block;
  }
  small kbd {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 1pt 3pt;
    font-size: larger;
    border-radius: 2pt;
  }
</style>
