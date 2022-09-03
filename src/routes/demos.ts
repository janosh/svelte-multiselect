export const demo_routes = Object.keys(import.meta.glob(`./**/*.svx`)).map(
  (filename) => filename.split(`.`)[1].replace(`/+page`, ``)
)
if (demo_routes.length < 5) {
  throw `Too few demo routes found: ${demo_routes.length}`
}
