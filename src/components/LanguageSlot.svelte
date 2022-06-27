<script lang="ts">
  import { get_label, Option } from '../lib'
  export let option: Option
  export let height = `20px`
  export let gap = '5pt'

  const repo = `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons`

  $: lang = String(get_label(option))
    .toLowerCase()
    .replaceAll(`+`, `p`)
    .replace(`#`, `sharp`)
    .replace(`javascript`, `js`)
    .replace(`dart`, `dartlang`)
  $: src = `${repo}/file_type_${lang}.svg`

  let hidden = false
  // default back to visible every time src changes to see if the image loads successfully
  $: src, (hidden = false)
</script>

<span style:gap>
  <img {src} {height} alt={lang} {hidden} on:error={() => (hidden = true)} />
  {option}
</span>

<style>
  span {
    display: flex;
  }
</style>
