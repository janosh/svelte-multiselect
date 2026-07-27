export const slugify_heading_text = (text: string): string =>
  text
    .normalize(`NFKD`)
    .replaceAll(/[\u0300-\u036F]/g, ``)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, `-`)
    .replaceAll(/^-+|-+$/g, ``)

export function unique_id(base_id: string, used_ids: Set<string>): string {
  const base = base_id || `section`
  let id = base
  let suffix = 2

  while (used_ids.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }

  return id
}

export function get_heading_visibility(
  levels: readonly number[],
  active_idx: number | null,
  collapse_threshold: number,
): boolean[] {
  if (active_idx === null) return levels.map(() => true)

  const min_level = levels.length ? Math.min(...levels) : 0
  const expanded = levels.map(() => false)

  if (active_idx !== -1) {
    expanded[active_idx] = true
    let need = levels[active_idx]
    for (let idx = active_idx - 1; idx >= 0 && need > min_level; idx--) {
      if (levels[idx] < need) {
        expanded[idx] = true
        need = levels[idx]
      }
    }
  }

  const visible: boolean[] = []
  for (let idx = 0; idx < levels.length; idx++) {
    const level = levels[idx]

    if (level === min_level) {
      visible.push(true)
    } else if (level <= collapse_threshold) {
      let parent_idx = idx - 1
      while (parent_idx >= 0 && levels[parent_idx] >= level) parent_idx--
      visible.push(parent_idx < 0 || expanded[parent_idx])
    } else {
      let ancestor_idx = idx - 1
      while (ancestor_idx >= 0 && levels[ancestor_idx] > collapse_threshold) {
        ancestor_idx--
      }
      visible.push(
        ancestor_idx < 0 ||
          levels[ancestor_idx] < collapse_threshold ||
          visible[ancestor_idx],
      )
    }
  }

  return visible
}
