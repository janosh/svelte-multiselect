## User interface

### Food Picker (initially invalid)

```svelte example id="foods"
<script>
  import MultiSelect from '$lib'
  import { foods } from '$site/options'

  function random_color() {
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    return `rgb(${r}, ${g}, ${b})`
  }
</script>

<MultiSelect
  options={foods.map((label) => ({ label, style: `background-color: ${random_color()}` }))}
  placeholder="Pick your favorite foods"
  removeAllTitle="Remove all foods"
  closeDropdownOnSelect
  style="width: 500px"
  invalid
/>
```

This page is used for Playwright testing to ensure

- the remove-all button
  - removes all currently selected options from the input
  - only appears if 2 or more elements are selected
  - has custom title (if supplied via prop `removeAllTitle`)
- the component can be focused
  - which opens dropdown
  - and closes the dropdown when the user tabs out of input or clicks/taps outside component
  - importantly, don't close the dropdown when input loses focus
- filters options to only list matches when entering text
- accessibility
  - input is `aria-invalid` when the component has `invalid=true`
  - has `aria-expanded='false'` when closed
  - has `aria-expanded='true'` when open
  - options have `aria-selected='false'` and selected items have `aria-selected='true`
  - invisible `input.form-control` is `aria-hidden`
- `closeDropdownOnSelect`: when `true`, the input is not focused when an option is selected and the dropdown is closed

<!-- TODO figure out why Playwright test 'loops through the dropdown list with arrow keys making...'
depends on `html { scroll-behavior: smooth; }` -->
<style>
  :global(html) {
    scroll-behavior: smooth;
  }
</style>
