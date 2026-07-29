<script lang="ts">
  // Internal test page for playwright e2e tests (tests/playwright/CommandMenu.test.ts):
  // inside a shadow root a click retargets to the host by the time it reaches window, so
  // only composedPath() still names the element it landed on. happy-dom retargets nothing,
  // so no unit test can tell composedPath() and event.target apart.
  import { CommandMenu } from '$lib'
  import { mount, unmount } from 'svelte'

  const actions = [`alpha`, `beta`, `gamma`].map((label) => ({ label, action: () => {} }))

  const in_shadow_root = (node: HTMLElement) => {
    const app = mount(CommandMenu, {
      target: node.attachShadow({ mode: `open` }),
      props: { actions, open: true, fade_duration: 0 },
    })
    return () => void unmount(app)
  }
</script>

<h2>Command menu in a shadow root</h2>

<div id="shadow-host" {@attach in_shadow_root}></div>
