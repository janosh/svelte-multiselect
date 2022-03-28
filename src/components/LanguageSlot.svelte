<script lang="ts">
  import { Option } from '../lib'

  export let option: Option
  export let height = `20px`

  const repo = `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons`

  $: lang = `${option.label}`
    .toLowerCase()
    .replaceAll(`+`, `p`)
    .replace(`#`, `sharp`)
    .replace(`javascript`, `js`)
    .replace(`dart`, `dartlang`)
  $: src = `${repo}/file_type_${lang}.svg`

  let hidden = false
  $: fetch(src).then((resp) => {
    hidden = resp.status !== 200
  })
</script>

<span style="display: flex; gap: 3pt;">
  {option.label}
  <img {src} {height} alt={lang} {hidden} />
</span>
