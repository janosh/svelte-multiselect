<script>
  import MultiSelect from '../../../package/MultiSelect.svelte'

  const placeholder = `Take your pick...`
</script>

<MultiSelect
  {...$$props}
  {placeholder}
  --sms-active-color="var(--blue)"
  --sms-options-bg="black" />
