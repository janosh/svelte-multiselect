// Shape of a single glyph. `d` covers the common one-path case; `markup` carries bodies
// with several shapes, gradients or masks that a single path cannot express.
export type IconData = {
  viewBox: string
  stroke?: string
  fill?: string
} & ({ d: string; markup?: never } | { d?: never; markup: string })
