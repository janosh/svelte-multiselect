<p align="center">
  <img src="https://raw.githubusercontent.com/janosh/svelte-multiselect/main/site/static/favicon.svg" alt="Svelte MultiSelect" height=150>
</p>

# Svelte MultiSelect [![Netlify Status](https://api.netlify.com/api/v1/badges/a45b62c3-ea45-4cfd-9912-77ec4fc8d7e8/deploy-status)](https://app.netlify.com/sites/svelte-multiselect/deploys)

**[Live demo](https://svelte-multiselect.netlify.app)**.

## Key Features

- Single / multiple select
- Dropdowns
- Searchable
- Tagging
- Server-side rendering
- Configurable
- No dependencies
- Keyboard friendly

## Installation

```sh
yarn add -D svelte-multiselect
```

## Usage

```svelte
<script>
  import MultiSelect from 'svelte-multiselect'

  const webFrameworks = [
    `Svelte`,
    `React`,
    `Vue`,
    `Angular`,
    `Polymer`,
    `Ruby on Rails`,
    `ASP.net`,
    `Laravel`,
    `Django`,
    `Express`,
    `Spring`,
  ]
  const name = `webFrameworks`
  const placeholder = `Take your pick...`
  const required = true

  let input
</script>

Favorite Web Frameworks?

<MultiSelect bind:input {name} {placeholder} options={webFrameworks} {required} />
```

Full list of props/bindable variables for this component:

- `options` (required): Array of strings (or integers) that will be listed in the dropdown selection.
- `selected = []`: Array of currently/pre-selected options when binding/passing as props respectively.
- `readonly = false`: Disables the input. User won't be able to interact with it.
- `placeholder = ''`: String shown when no option is selected.
- `single = false`: Allows only a single option to be selected when true.
- `required = false`: Prevents submission in an HTML form when true.
- `input = undefined`: Handle to the DOM node storing the currently selected options in JSON format as its `value` attribute.
- `name = ''`: Used as reference for associating HTML form labels with this component as well as for the `input` `id`. That is, the same DOM node `input` bindable through `<MultiSelect bind:input />` is also retrievable via `document.getElementByID(name)` e.g. for use in a JS file outside a Svelte component.
