<script lang="ts">
  import { resolve } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Styling Overview"
  subtitle="Examples for appearance customization with styles, classes, snippets, and HTML labels."
  subpages={[
    [`UI`, resolve(`/ui`), `Core UI controls and visual states.`],
    [`CSS Classes`, resolve(`/css-classes`), `Class-based styling hooks.`],
    [`Snippets`, resolve(`/snippets`), `Custom rendering with snippets.`],
    [`HTML Labels`, resolve(`/parse-labels-as-html`), `Render option labels as HTML.`],
    [`Portal`, resolve(`/portal`), `Portaled dropdown rendering and layering.`],
  ]}
/>
