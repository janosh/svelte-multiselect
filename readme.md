<h1 align="center">
  <img src="https://raw.githubusercontent.com/janosh/svelte-widgets/main/src/site/favicon.svg" alt="Svelte Widgets" height="60" width="60">
  <br class="hide-in-docs"> Svelte Widgets
</h1>

<h4 align="center">

[![Tests](https://github.com/janosh/svelte-widgets/actions/workflows/test.yml/badge.svg)](https://github.com/janosh/svelte-widgets/actions/workflows/test.yml)
[![GitHub Pages](https://github.com/janosh/svelte-widgets/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/janosh/svelte-widgets/actions/workflows/gh-pages.yml)
[![NPM version](https://img.shields.io/npm/v/svelte-widgets?logo=NPM&color=purple)](https://npmjs.com/package/svelte-widgets)
[![Needs Svelte version](https://img.shields.io/npm/dependency-version/svelte-widgets/peer/svelte?color=teal&logo=Svelte&label=Svelte)](https://github.com/sveltejs/svelte/blob/master/packages/svelte/CHANGELOG.md)
[![Playground](https://img.shields.io/badge/Svelte-Playground-blue?label=Try%20it!)](https://svelte.dev/playground/a5a14b8f15d64cb083b567292480db05)
[![Open in StackBlitz](https://img.shields.io/badge/Open%20in-StackBlitz-darkblue?logo=stackblitz)](https://stackblitz.com/github/janosh/svelte-widgets)

</h4>

<p align="center"><strong>
  Keyboard-friendly, accessible and highly customizable Svelte components.
  <a class="hide-in-docs" href="https://janosh.github.io/svelte-widgets">View the docs</a>
</strong></p>

## 🧩 &thinsp; Components

Every component is a named export from the package root. `MultiSelect`, `CommandMenu`,
`PageSearch`, `Toc` and `Masonry` also have a direct subpath import
(`svelte-widgets/Toc.svelte`) so bundlers can skip the rest:

| Component       | What it does                                                                            | Docs                                                                 |
| --------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `MultiSelect`   | Keyboard-friendly multi/single select with grouping, async loading and deep style hooks | [docs](https://janosh.github.io/svelte-widgets/multiselect)          |
| `CommandMenu`   | Command palette with fuzzy search, hotkeys, recents and async actions                   | [docs](https://janosh.github.io/svelte-widgets/command-menu)         |
| `PageSearch`    | Pagefind-backed site search built on `CommandMenu`                                      | [docs](https://janosh.github.io/svelte-widgets/command-menu)         |
| `Popover`       | Floating surface that positions, dismisses and traps focus for you                      | [docs](https://janosh.github.io/svelte-widgets/popover)              |
| `ContextMenu`   | Right-click menu anchored to the pointer, with arrow-key navigation                     | [docs](https://janosh.github.io/svelte-widgets/popover)              |
| `Nav`           | Navigation bar with dropdowns, pinning and active-route styling                         | [docs](https://janosh.github.io/svelte-widgets/nav)                  |
| `Toc`           | Sticky table of contents that finds and tracks its own headings                         | [docs](https://janosh.github.io/svelte-widgets/toc)                  |
| `Masonry`       | Column-balancing masonry grid with SSR support and virtualization                       | [docs](https://janosh.github.io/svelte-widgets/masonry)              |
| `CopyButton`    | Copy-to-clipboard button with pending, success and error states                         | [docs](https://janosh.github.io/svelte-widgets/copy-button)          |
| `ThemeToggle`   | Light/dark/system theme cycler that persists the choice                                 | [docs](https://janosh.github.io/svelte-widgets/extras#themetoggle)   |
| `Toggle`        | Accessible switch with a bindable `checked`                                             | [docs](https://janosh.github.io/svelte-widgets/extras#toggle)        |
| `CodeExample`   | Collapsible source viewer used by the live examples                                     | [docs](https://janosh.github.io/svelte-widgets/extras#codeexample)   |
| `FileDetails`   | Collapsible `<details>` viewer for a set of files                                       | [docs](https://janosh.github.io/svelte-widgets/extras#filedetails)   |
| `PrevNext`      | Previous/next links for sequential pages                                                | [docs](https://janosh.github.io/svelte-widgets/extras#prevnext)      |
| `SubpageGrid`   | Card grid linking to child pages                                                        | [docs](https://janosh.github.io/svelte-widgets/extras#subpagegrid)   |
| `Icon`          | Inline SVG icon from the bundled set                                                    | [docs](https://janosh.github.io/svelte-widgets/extras#icon)          |
| `GitHubCorner`  | The classic corner ribbon link                                                          | [docs](https://janosh.github.io/svelte-widgets/extras#githubcorner)  |
| `CircleSpinner` | Minimal loading spinner                                                                 | [docs](https://janosh.github.io/svelte-widgets/extras#circlespinner) |
| `Wiggle`        | Spring-animated shake wrapper                                                           | [docs](https://janosh.github.io/svelte-widgets/wiggle)               |

Ten [attachments](https://janosh.github.io/svelte-widgets/attachments) ship alongside them
and work on any element. Nine come from `svelte-widgets/attachments`: `click_outside`,
`float`, `focus_trap`, `hotkey`, `tooltip`, `draggable`, `resizable`, `sortable` and
`highlight_matches`. The tenth, `heading_anchors`, has its own
`svelte-widgets/heading-anchors` subpath.

```svelte
<script>
  import { CommandMenu, MultiSelect, Popover, Toc } from 'svelte-widgets'
</script>
```

<slot name="examples" />

## 💡 &thinsp; Features

- **No run-time deps:** every component needs only Svelte as a peer dependency
- **Keyboard friendly:** every interactive component is fully operable without a mouse
- **Bindable:** component state is exposed through `$bindable` props, so you can both read it and drive it from the outside
- **Themeable:** CSS variables with sensible defaults on every element, plus prop bags to spread arbitrary attributes onto internals
- **SSR-safe:** nothing touches `window` or `localStorage` before mount
- **Typed:** props, snippets and events are inferred from the data you pass

## 🧪 &thinsp; Coverage

| Statements                                                                         | Branches                                                                       | Lines                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| ![Statements](https://img.shields.io/badge/statements-93%25-yellow.svg?style=flat) | ![Branches](https://img.shields.io/badge/branches-87%25-yellow.svg?style=flat) | ![Lines](https://img.shields.io/badge/lines-94%25-yellow.svg?style=flat) |

## 🔨 &thinsp; Installation

```sh
npm install --dev svelte-widgets
```

## 🚚 &thinsp; Migrating from `svelte-multiselect`

This package was called `svelte-multiselect` up to v11. Swap it out:

```sh
npm uninstall svelte-multiselect && npm install -D svelte-widgets
```

Then rewrite the imports. Matching on the opening quote keeps prose and GitHub URLs
untouched, and covers every subpath (`/attachments`, `/utils`, `/types`,
`/heading-anchors`, `/live-examples`) along with the bare import:

```sh
find src -type f \( -name '*.svelte' -o -name '*.ts' -o -name '*.js' \) -exec perl -pi -e "s{(['\"])svelte-multiselect}{\$1svelte-widgets}g" {} +
```

Three things the rewrite cannot do for you: `CmdPalette` is now `CommandMenu`,
`PagefindPalette` is now `PageSearch`, and `click_outside` changed shape (it dismisses on
`pointerdown`, and `exclude`/`include` merged into one `inside` option). See the
[changelog](changelog.md) for the details.

Coming from `svelte-toc` or `svelte-bricks` instead? Those are now `Toc` and `Masonry`
here, so the same swap applies with `import { Toc } from 'svelte-widgets'` and
`import { Masonry } from 'svelte-widgets'`.

## 📦 &thinsp; Subpath exports

Attachments and utilities are also available as subpath imports:

```ts
import {
  click_outside, // dismiss a surface when a press lands outside it
  draggable,
  float, // park an element next to an anchor and keep it there
  focus_trap, // keep Tab inside a surface, hand focus back when it closes
  highlight_matches,
  hotkey, // declarative keybindings, `mod` maps to Cmd or Ctrl
  sortable,
  tooltip,
} from 'svelte-widgets/attachments'
import { compute_position, fuzzy_match, get_label } from 'svelte-widgets/utils'
import { heading_anchors } from 'svelte-widgets/heading-anchors'
```

`Popover` and `ContextMenu` compose these three: a surface positioned by `float`,
dismissed by `click_outside` (on the press, so a right-click closes it too) and
keyboard-scoped by `focus_trap`.

```svelte
<script lang="ts">
  import { ContextMenu, Popover } from 'svelte-widgets'
</script>

<Popover placement="bottom" align="start">
  {#snippet trigger(props)}
    <button {...props}>Options</button>
  {/snippet}
  <p>Anything you like in here.</p>
</Popover>

<ContextMenu actions={[{ label: `Reload`, action: () => location.reload() }]}>
  <div>Right-click anywhere in this region</div>
</ContextMenu>
```

See [src/lib/live-examples/readme.md](https://github.com/janosh/svelte-widgets/blob/main/src/lib/live-examples/readme.md) for optional live-example helpers.

## 🆕 &thinsp; Changelog

[View the changelog](changelog.md).

## 🙏 &thinsp; Contributing

Here are some steps to [get you started](contributing.md) if you'd like to contribute to this project!
