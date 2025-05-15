## Disabled MultiSelect

<label for="disabled">Favorite frontend tool?</label>

```svelte example stackblitz id="disabled-input-title"
<script>
  import MultiSelect from '$lib'
</script>

<MultiSelect
  id="disabled"
  options={[`Svelte`]}
  selected={[`Svelte`]}
  disabled
  disabledInputTitle="Super special disabled message (shows on hover)"
  --sms-disabled-bg="darkred"
>
  {#snippet disabledIcon()}
    <span>This component is disabled. It won't even open.</span>
  {/snippet}
</MultiSelect>
```

The mouse tooltip will show `disabledInputTitle` when hovering the component.
