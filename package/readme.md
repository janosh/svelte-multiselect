<p align="center">
  <img src="https://raw.githubusercontent.com/janosh/svelte-multiselect/main/site/static/favicon.svg" alt="Svelte MultiSelect" height=150>
</p>

# Svelte MultiSelect [![Netlify Status](https://api.netlify.com/api/v1/badges/a45b62c3-ea45-4cfd-9912-77ec4fc8d7e8/deploy-status)](https://app.netlify.com/sites/svelte-multiselect/deploys)

Keyboard-friendly, zero-dependency `MultiSelect` Svelte component.

**[Live demo](https://svelte-multiselect.netlify.app)**.

## Key Features

- **Single / multiple select:** pass `single` prop to only allow one selection
- **Dropdowns:** scrollable lists for large numbers of options
- **Searchable:** start typing to filter options
- **Tagging:** selected options are recorded as tags within the text input
- **Server-side rendering:** no reliance on browser objects like `window` or `document`
- **Configurable:** see section [props](#props)
- **No dependencies:** needs only Svelte as dev dependency
- **Keyboard friendly** for mouse-less form completion

## Installation

```sh
yarn add -D svelte-multiselect
```

## Usage

```svelte
<script>
  import MultiSelect from 'svelte-multiselect'

  const webFrameworks = [`Svelte`, `React`, `Vue`, `Angular`, `Polymer`, `Ruby on Rails`, `ASP.net`, `Laravel`, `Django`, `Express`, `Spring`]

  const name = `webFrameworks`
  const placeholder = `Take your pick...`
  const required = true

  let selected
</script>

Favorite Web Frameworks?

<MultiSelect bind:selected {name} {placeholder} options={webFrameworks} {required} />
```

## Props

Full list of props/bindable variables for this component:

| name          | default     | description                                                                                                                                                                                                                                                                                            |
| :------------ | :---------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`     | [required]  | Array of strings (or integers) that will be listed in the dropdown selection.                                                                                                                                                                                                                          |
| `selected`    | `[]`        | Array of currently/pre-selected options when binding/passing as props respectively.                                                                                                                                                                                                                    |
| `readonly`    | `false`     | Disables the input. User won't be able to interact with it.                                                                                                                                                                                                                                            |
| `placeholder` | `''`        | String shown when no option is selected.                                                                                                                                                                                                                                                               |
| `single`      | `false`     | Allows only a single option to be selected when true.                                                                                                                                                                                                                                                  |
| `required`    | `false`     | Prevents submission in an HTML form when true.                                                                                                                                                                                                                                                         |
| `input`       | `undefined` | Handle to the DOM node storing the currently selected options in JSON format as its `value` attribute.                                                                                                                                                                                                 |
| `name`        | `''`        | Used as reference for associating HTML form labels with this component as well as for the `input` `id`. That is, the same DOM node `input` bindable through `<MultiSelect bind:input />` is also retrievable via `document.getElementByID(name)` e.g. for use in a JS file outside a Svelte component. |

## Want to contribute?

Clone the repo, install dev dependencies and start the dev server to test your changes before submitting a PR.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
yarn
yarn dev
```

## Styling

You can style every part of this component by using the following selectors. Overriding properties that the component already sets internally requires the `!important` keyword.

```css
:global(.multiselect) {
  /* top-level wrapper div */
}
:global(.multiselect span.token) {
  /* selected options */
}
:global(.multiselect span.token button),
:global(.multiselect .remove-all) {
  /* buttons to remove a single or all selected options at once */
}
:global(.multiselect ul) {
  /* dropdown options */
}
:global(.multiselect ul li) {
  /* dropdown options */
}
:global(li.selected) {
  /* selected options in the dropdown list */
}
:global(li:not(.selected):hover) {
  /* unselected but hovered options in the dropdown list */
}
:global(li.selected:hover) {
  /* selected and hovered options in the dropdown list */
  /* probably not necessary to style this state in most cases */
}
:global(li.active) {
  /* active means element was navigated to with up/down arrow keys */
  /* ready to be selected by pressing enter */
}
:global(li.selected.active) {
}
```
