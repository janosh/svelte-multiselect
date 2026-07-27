## User interface

### Food Picker (initially invalid)

```svelte example id="foods"
<script lang="ts">
  import MultiSelect from '$lib'
  import { foods } from '$site/options'

  function random_color(): string {
    const [r, g, b] = Array.from([1, 2, 3], (_) => Math.floor(Math.random() * 255))
    return `rgba(${r}, ${g}, ${b}, 0.3)`
  }
  let options = $derived(
    foods.map((label) => ({
      label,
      style: `background-color: ${random_color()}`,
    })),
  )
</script>

<MultiSelect
  {options}
  placeholder="Pick your favorite foods"
  removeAllTitle="Remove all foods"
  closeDropdownOnSelect
  style="width: 500px"
  invalid
/>
```

### Retain Focus Picker

```svelte example id="retain-focus"
<script lang="ts">
  import MultiSelect from '$lib'

  const options = [`Svelte`, `Solid`, `React`]
</script>

<MultiSelect
  {options}
  closeDropdownOnSelect="retain-focus"
  placeholder="Pick a framework"
/>
```

This page is the fixture for the Playwright UI tests in `tests/playwright/MultiSelect.test.ts`, which cover the remove-all button, focus and dropdown open/close behavior, filtering, and the ARIA attributes.

<!-- Smooth scroll is required for arrow key navigation tests to work correctly.
The Playwright test 'loops through the dropdown list with arrow keys' depends on this. -->
<style>
  @media (prefers-reduced-motion: no-preference) {
    :global(html) {
      scroll-behavior: smooth;
    }
  }
</style>
