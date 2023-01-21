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

<style>
  footer {
    display: flex;
    margin: 2em;
    gap: 15pt;
    place-content: center;
    flex-wrap: wrap;
  }
</style>
