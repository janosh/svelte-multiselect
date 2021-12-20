<div class="maybe-hide">

<p align="center">
  <img src="static/favicon.svg" alt="Svelte MultiSelect" height=80>
</p>

<h1 align="center">Svelte MultiSelect</h1>

<h4 align="center">

[![Netlify Status](https://api.netlify.com/api/v1/badges/a45b62c3-ea45-4cfd-9912-77ec4fc8d7e8/deploy-status)](https://app.netlify.com/sites/svelte-multiselect/deploys)
[![NPM version](https://img.shields.io/npm/v/svelte-multiselect?color=blue&logo=NPM)](https://npmjs.com/package/svelte-multiselect)
[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/janosh/svelte-multiselect/main.svg)](https://results.pre-commit.ci/latest/github/janosh/svelte-multiselect/main)

</h4>

**[Live demo](https://svelte-multiselect.netlify.app)**.

</div>

<!-- remove above in docs -->

**Keyboard-friendly, zero-dependency multi-select Svelte component.**

## Key Features

- **Single / multiple select:** pass `maxSelect={1}` prop to only allow one selection
- **Dropdowns:** scrollable lists for large numbers of options
- **Searchable:** start typing to filter options
- **Tagging:** selected options are recorded as tags within the text input
- **Server-side rendering:** no reliance on browser objects like `window` or `document`
- **Configurable:** see [props](#props)
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

  let selected
</script>

Favorite Web Frameworks?

<code>selected = {JSON.stringify(selected)}</code>

<MultiSelect bind:selected options={webFrameworks} />
```

## Props

Full list of props/bindable variables for this component:

<div class="table">

| name             | default       | description                                                                                                                                                                                    |
| :--------------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`        | required prop | Array of strings/numbers or `Option` objects that will be listed in the dropdown. See `src/lib/index.ts` for admissible fields. The `label` is the only mandatory one. It must also be unique. |
| `activeOption`   | `null`        | Currently active option, i.e. the one the user currently hovers or navigated to with arrow keys.                                                                                               |
| `maxSelect`      | `null`        | Positive integer to limit the number of options users can pick. `null` means no limit.                                                                                                         |
| `selected`       | `[]`          | Array of currently/pre-selected options when binding/passing as props respectively.                                                                                                            |
| `selectedLabels` | `[]`          | Labels of currently selected options.                                                                                                                                                          |
| `selectedValues` | `[]`          | Values of currently selected options.                                                                                                                                                          |
| `readonly`       | `false`       | Disable the component. It will still be rendered but users won't be able to interact with it.                                                                                                  |
| `placeholder`    | `''`          | String shown in the text input when no option is selected.                                                                                                                                     |
| `input`          | `undefined`   | Handle to the `<input>` DOM node.                                                                                                                                                              |
| `name`           | `''`          | Passed to the `<input>` for associating HTML form `<label>`s with this component. E.g. clicking a `<label>` with same name will focus this component.                                          |

</div>

## Events

`MultiSelect.svelte` dispatches the following events:

| name     | details                         | description                                                                                                                                    |
| -------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `add`    | `token: string`                 | Triggers when a new token is selected.                                                                                                         |
| `remove` | `token: string`                 | Triggers when one or all selected tokens are removed. `event.detail.token` will be a single or multiple tokens, respectively.                  |
| `change` | `token: string`, `type: string` | Triggers when a token is either added or removed, or all tokens are removed at once. `event.detail.type` will be either `'add'` or `'remove'`. |
| `blur`   | none                            | Triggers when the input field looses focus.                                                                                                    |

### Examples

<!-- prettier-ignore -->
- `on:add={(event) => console.log(event.detail.token.label)}`
- `on:remove={(event) => console.log(event.detail.token.label)}`.
- ``on:change={(event) => console.log(`${event.detail.type}: '${event.detail.token.label}'`)}``
- `on:blur={yourFunctionHere}`

```svelte
<MultiSelect
  on:change={(e) => alert(`You ${e.detail.type}ed '${e.detail.token.label}'`)}
/>
```

## Styling

There are 3 ways to style this component.

### With CSS variables

The first, if you only want to make small adjustments, allows you to pass the following CSS variables directly to the component as props.

- `border: var(--sms-border, 1pt solid lightgray)`: Border around top-level `div.multiselect`. Change this to e.g. to `1px solid red` to indicate this form field is in an invalid state.
- `border-radius: var(--sms-border-radius, 5pt)`: `div.multiselect` border radius.
- `color: var(--sms-text-color, inherit)`: Input text color.
- `border: var(--sms-focus-border, 1pt solid var(--sms-active-color, cornflowerblue))`: `div.multiselect` border when focused. Falls back to `--sms-active-color` if not set which in turn falls back on `cornflowerblue`.
- `background: var(--sms-readonly-bg, lightgray)`: Background when in readonly state.
- `background: var(--sms-token-bg, var(--sms-active-color, cornflowerblue))`: Background of selected tokens.
- `color: var(--sms-remove-x-hover+focus-color, lightgray)`: Hover color of cross icon to remove selected tokens.
- `color: var(--sms-remove-x-hover-focus-color, lightskyblue)`: Color of the cross-icon buttons for removing all or individual selected options when in `:focus` or `:hover` state.
- `background: var(--sms-options-bg, white)`: Background of options list.
- `background: var(--sms-li-selected-bg, inherit)`: Background of selected list items in options pane.
- `color: var(--sms-li-selected-color, inherit)`: Text color of selected list items in options pane.
- `background: var(--sms-li-active-bg, var(--sms-active-color, cornflowerblue))`: Background of active (currently with arrow keys highlighted) list item.
- `background: var(--sms-li-disabled-bg, #f5f5f6)`: Background of disabled options in the dropdown list.
- `color: var(--sms-li-disabled-text, #b8b8b8)`: Text color of disabled option in the dropdown list.

For example, to change the background color of the options dropdown:

```svelte
<MultiSelect --sms-options-bg="white" />
```

### With CSS frameworks

The second method allows you to pass in custom classes to the important DOM elements of this component to target them with frameworks like [Tailwind CSS](https://tailwindcss.com).

- `outerDivClass`
- `ulTokensClass`
- `liTokenClass`
- `ulOptionsClass`
- `liOptionClass`

This simplified version of the DOM structure of this component shows where these classes are inserted:

```svelte
<div class={outerDivClass}>
  <ul class={ulTokensClass}>
    <li class={liTokenClass}>First selected tag</li>
    <li class={liTokenClass}>Second selected tag</li>
  </ul>
  <ul class={ulOptionsClass}>
    <li class={liOptionClass}>First available option</li>
    <li class={liOptionClass}>Second available option</li>
  </ul>
</div>
```

### Granular control through global CSS

You can alternatively style every part of this component with more fine-grained control by using the following `:global()` CSS selectors. `ul.tokens` is the list of currently selected options rendered inside the component's input whereas `ul.options` is the list of available options that slides out when the component has focus.

```css
:global(.multiselect) {
  /* top-level wrapper div */
}
:global(.multiselect ul.tokens > li) {
  /* selected options */
}
:global(.multiselect ul.tokens > li button),
:global(.multiselect button.remove-all) {
  /* buttons to remove a single or all selected options at once */
}
:global(.multiselect ul.options) {
  /* dropdown options */
}
:global(.multiselect ul.options li) {
  /* dropdown list of available options */
}
:global(.multiselect ul.options li.selected) {
  /* selected options in the dropdown list */
}
:global(.multiselect ul.options li:not(.selected):hover) {
  /* unselected but hovered options in the dropdown list */
}
:global(.multiselect ul.options li.selected:hover) {
  /* selected and hovered options in the dropdown list */
  /* probably not necessary to style this state in most cases */
}
:global(.multiselect ul.options li.active) {
  /* active means item was navigated to with up/down arrow keys */
  /* ready to be selected by pressing enter */
}
:global(.multiselect ul.options li.selected.active) {
  /* both active and already selected, pressing enter now will deselect the item */
}
:global(.multiselect ul.options li.disabled) {
  /* options with disabled key set to true (see props above) */
}
```

## Want to contribute?

To submit a PR, clone the repo, install dependencies and start the dev server to try out your changes.

```sh
git clone https://github.com/janosh/svelte-multiselect
cd svelte-multiselect
yarn
yarn dev
```
