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

This page is used for Playwright testing to ensure

- the remove-all button
  - removes all currently selected options from the input
  - only appears if 2 or more elements are selected
  - has custom title (if supplied via prop `removeAllTitle`)
- the component can be focused
  - which opens dropdown
  - closes the dropdown when focus leaves the component via Tab or a click/tap outside
  - does not close the dropdown when the input alone loses focus within the component
- filters options to only list matches when entering text
- accessibility
  - input is `aria-invalid` when the component has `invalid=true`
  - has `aria-expanded='false'` when closed
  - has `aria-expanded='true'` when open
  - options have `aria-selected='false'` and selected items have `aria-selected='true'`
  - invisible `input.form-control` is `aria-hidden`
- `closeDropdownOnSelect`: when `true`, the input is not focused when an option is selected and the dropdown is closed

<!-- Smooth scroll is required for arrow key navigation tests to work correctly.
The Playwright test 'loops through the dropdown list with arrow keys' depends on this. -->
<style>
  @media (prefers-reduced-motion: no-preference) {
    :global(html) {
      scroll-behavior: smooth;
    }
  }
</style>
