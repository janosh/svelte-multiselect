<div class="maybe-hide">

<p align="center">
  <img src="static/favicon.svg" alt="Svelte MultiSelect" height=150>
</p>

# Svelte MultiSelect [![Netlify Status](https://api.netlify.com/api/v1/badges/a45b62c3-ea45-4cfd-9912-77ec4fc8d7e8/deploy-status)](https://app.netlify.com/sites/svelte-multiselect/deploys) [![NPM version](https://img.shields.io/npm/v/svelte-multiselect?color=blue&logo=NPM)](https://npmjs.com/package/svelte-multiselect)

**[Live demo](https://svelte-multiselect.netlify.app)**.

</div>

<!-- remove above in docs -->

Keyboard-friendly, zero-dependency multi-select Svelte component.

## Key Features

- **Single / multiple select:** pass `maxSelect={1}` prop to only allow one selection
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

<div class="table">

| name          | default                             | description                                                                                                                                                                                                                                                                                            |
| :------------ | :---------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`     | [required]                          | Array of strings (or integers) that will be listed in the dropdown selection.                                                                                                                                                                                                                          |
| `maxSelect`   | `null`                              | `null` or positive integer to allow users to select as many as they like or a maximum number of options, respectively.                                                                                                                                                                                 |
| `selected`    | `[]` (or `''` if `maxSelect === 1`) | Array of currently/pre-selected options when binding/passing as props respectively.                                                                                                                                                                                                                    |
| `readonly`    | `false`                             | Disables the input. User won't be able to interact with it.                                                                                                                                                                                                                                            |
| `placeholder` | `''`                                | String shown when no option is selected.                                                                                                                                                                                                                                                               |
| `required`    | `false`                             | Prevents submission in an HTML form when true.                                                                                                                                                                                                                                                         |
| `input`       | `undefined`                         | Handle to the DOM node storing the currently selected options in JSON format as its `value` attribute.                                                                                                                                                                                                 |
| `name`        | `''`                                | Used as reference for associating HTML form labels with this component as well as for the `input` `id`. That is, the same DOM node `input` bindable through `<MultiSelect bind:input />` is also retrievable via `document.getElementByID(name)` e.g. for use in a JS file outside a Svelte component. |

</div>

## Want to contribute?

The repo is split into two workspaces, the `package` itself and the demo `site`. To submit a PR, best clone the repo, install dependencies and start the dev server to try out your changes first.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
yarn
yarn workspace site dev
```

## Styling

You can pass the following CSS variables directly to the component as props.

- `border: var(--sms-border, 1pt solid lightgray)`: Border around top-level `div.multiselect`.
- `border-radius: var(--sms-border-radius, 5pt)`: `div.multiselect` border radius.
- `color: var(--sms-text-color, inherit)`: Input text color.
- `border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue))`: `div.multiselect` border when focused.
- `background: var(--sms-readonly-bg, lightgray)`: Background when in readonly state.
- `background: var(--sms-token-bg, var(--sms-active-color, cornflowerblue))`: Background of selected tokens.
- `color: var(--sms-remove-x-hover-color, lightgray)`: Hover color of cross icon to remove selected tokens.
- `background: var(--sms-options-bg, white)`: Background of options list.
- `background: var(--sms-li-selected-bg, inherit)`: Background of selected list items in options pane.
- `color: var(--sms-li-selected-color, inherit)`: Text color of selected list items in options pane.
- `background: var(--sms-li-active-bg, var(--sms-active-color, cornflowerblue))`: Background of active (currently with arrow keys highlighted) list item.

You can alternatively style every part of this component with much more fine-grained control by using the following CSS selectors. Overriding properties that the component already sets internally requires the `!important` keyword.

```css
:global(.multiselect) {
  /* top-level wrapper div */
}
:global(.multiselect li.token) {
  /* selected options */
}
:global(.multiselect li.token button),
:global(.multiselect button.remove-all) {
  /* buttons to remove a single or all selected options at once */
}
:global(.multiselect ul.options) {
  /* dropdown options */
}
:global(.multiselect ul.options li) {
  /* dropdown options */
}
:global(ul.options li.selected) {
  /* selected options in the dropdown list */
}
:global(ul.options li:not(.selected):hover) {
  /* unselected but hovered options in the dropdown list */
}
:global(ul.options li.selected:hover) {
  /* selected and hovered options in the dropdown list */
  /* probably not necessary to style this state in most cases */
}
:global(ul.options li.active) {
  /* active means element was navigated to with up/down arrow keys */
  /* ready to be selected by pressing enter */
}
:global(ul.options li.selected.active) {
}
```
