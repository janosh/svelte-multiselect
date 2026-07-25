<script lang="ts">
  import { resolve } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Integration Overview"
  subtitle="Examples for integrating with app frameworks, persistence, and reusable behaviors."
  subpages={[
    [`Form Actions`, resolve(`/kit-form-actions`), `SvelteKit form action integration.`],
    [`Persistent`, resolve(`/persistent`), `Persist selection state across reloads.`],
    [`Attachments`, resolve(`/attachments`), `Reusable attachments and actions.`],
  ]}
/>
