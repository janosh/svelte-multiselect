<script lang="ts">
  import { page } from '$app/state'
  import { Nav } from '$lib'
  import { demo_pages } from '../routes/(demos)'

  let props = $props()
</script>

<Nav
  {...props}
  routes={[`/`, ...demo_pages]}
  {page}
  style={`max-width: var(--main-max-width); ${props.style ?? ``}`}
  labels={{
    '/': `Home`,
    '/ui': `UI`,
    '/css-classes': `CSS Classes`,
    '/kit-form-actions': `SvelteKit Form Actions`,
    '/cmd-palette': `CmdPalette`,
    ...(props.labels ?? {}),
  }}
  link_props={{
    style: `background: var(--surface); padding: 2pt 6pt; border-radius: 3px;`,
    ...(props.link_props ?? {}),
  }}
/>
