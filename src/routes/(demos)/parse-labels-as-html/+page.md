## Parse labels as HTML

When `parseLabelsAsHtml={true}`, MultiSelect renders HTML in option labels.

```svelte example
<script>
  import MultiSelect from '$lib'

  const red_pill =
    `🔴  &ensp; Red Pill (<a href="https://wikipedia.org/wiki/Red_pill_and_blue_pill">what?</a>)`
  const blue_pill =
    `🔵  &ensp; Blue Pill &nbsp; <img height="25px" style="vertical-align: middle;" src="https://upload.wikimedia.org/wikipedia/en/a/ab/Morpheus.jpg" />`
</script>

<MultiSelect
  options={[{ label: red_pill, value: `red pill` }, { label: blue_pill, value: `blue pill` }]}
  maxSelect={1}
  placeholder="Are you ready for the truth? Pick a pill!"
  parseLabelsAsHtml
  allowUserOptions
/>
```
