<script lang="ts">
  import { base } from '$app/paths'
  import { SubpageGrid } from '$lib'
</script>

<SubpageGrid
  title="Styling Overview"
  subtitle="Examples for appearance customization with styles, classes, snippets, and HTML labels."
  subpages={[
    [`UI`, `${base}/ui`, `Core UI controls and visual states.`],
    [`CSS Classes`, `${base}/css-classes`, `Class-based styling hooks.`],
    [`Snippets`, `${base}/snippets`, `Custom rendering with snippets.`],
    [`HTML Labels`, `${base}/parse-labels-as-html`, `Render option labels as HTML.`],
    [`Portal`, `${base}/portal`, `Portaled dropdown rendering and layering.`],
  ]}
/>
