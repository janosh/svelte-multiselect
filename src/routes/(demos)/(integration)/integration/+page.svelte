<script lang="ts">
  import { base } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Integration Overview"
  subtitle="Examples for integrating with app frameworks, persistence, and reusable behaviors."
  subpages={[
    [`Form Actions`, `${base}/kit-form-actions`, `SvelteKit form action integration.`],
    [`Persistent`, `${base}/persistent`, `Persist selection state across reloads.`],
    [`Attachments`, `${base}/attachments`, `Reusable attachments and actions.`],
  ]}
/>
