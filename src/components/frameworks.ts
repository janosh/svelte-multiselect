import { ProtoOption } from '../lib'

export const webFrameworks = [
  `Svelte`,
  `React`,
  `Vue`,
  `Angular`,
  `Polymer`,
  `Ruby on Rails`,
  `ASP.net`,
  `Laravel`,
  `Django`,
  `Express`,
  `Spring`,
  `jQuery`,
  `Flask`,
  `Flutter`,
  `Bootstrap`,
  `Sinatra`,
].map((label) => {
  const op: ProtoOption = { label }
  if (label === `Svelte`) op.something = `Kit`
  if (
    [
      `Svelte`,
      `React`,
      `Vue`,
      `Angular`,
      `Express`,
      `jQuery`,
      `Polymer`,
    ].includes(label)
  )
    op.something = `JavaScript`
  return op
})

export const mlFrameworks = [
  `TensorFlow`,
  `PyTorch`,
  `scikit-learn`,
  `Spark ML`,
  `Torch`,
  `Huggingface`,
  `Keras`,
  `Caffe`,
  `Theano`,
  `CNTK`,
].map((label) => {
  const op: ProtoOption = { label }
  if ([`CNTK`, `Theano`].includes(label)) op.disabled = true
  if (label === `PyTorch`) op.preselected = true
  return op
})
