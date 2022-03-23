<script lang="ts">
  import { Option } from '../lib'

  export let option: Option

  const repo = `https://raw.githubusercontent.com/abranhe/programming-languages-logos/master/src`

  $: lang = `${option.label}`.toLowerCase().replaceAll(`+`, `p`).replace(`#`, `sharp`)
  $: src = `${repo}/${lang}/${lang}.svg`
</script>

<span style="display: flex; gap: 3pt;">
  {option.label}
  <img {src} width="20px" alt={lang} />
</span>
