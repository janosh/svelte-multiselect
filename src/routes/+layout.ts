export const prerender = true

export const demo_routes = Object.keys(
  import.meta.glob(`./*/+page.{svx,svelte}`)
).map((filename) => filename.split(`.`)[1].replace(`/+page`, ``))

if (demo_routes.length < 5) {
  throw new Error(`Too few demo routes found: ${demo_routes.length}`)
}
